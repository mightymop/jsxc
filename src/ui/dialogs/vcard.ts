import Dialog from '../Dialog'
import { IContact } from '../../Contact.interface'
import Translation from '@util/Translation';
import { Presence } from '@connection/AbstractConnection';
import RosterItem from '../RosterItem';
import Client from '../../Client';

let vcardTemplate = require('../../../template/vcard.hbs');
let vcardBodyTemplate = require('../../../template/vcard-body.hbs');

let dialog: Dialog;

export default function(contact: IContact) {

   let resources = contact.getResources();
   let basicData = resources.map((resource) => {
      let presence = Presence[contact.getPresence(resource)];

      return {
         resource,
         client: Translation.t('loading'),
         presence: Translation.t(presence),
      }
   });

   let content = vcardTemplate({
      jid: contact.getJid().bare,
      name: contact.getName(),
      basic: basicData
   });

   dialog = new Dialog(content);
   dialog.open();

   if (Client.getOption('showTags',false))
   {
      let groups = contact.getGroups()&&contact.getGroups().length>0?RosterItem.convertGroupsToHtml(contact.getGroups()):Translation.t('no_groups');
      let tagselement = dialog.getDom().find('.jsxc-vcard-tags');
      tagselement.append(groups);
      dialog.getDom().find('.jsxc-vcard-tags').css('display','');
   }
   else
   {
      dialog.getDom().find('.jsxc-vcard-tags').css('display','none');
   }

   for (let resource of resources) {
      let clientElement = dialog.getDom().find(`[data-resource="${resource}"] .jsxc-client`);

      contact.getCapabilitiesByResource(resource).then(discoInfo => {
         if (discoInfo) {
            let identities = discoInfo.getIdentities();

            for (let identity of identities) {
               if (identity && identity.category === 'client') {
                  clientElement.text(`${identity.name} (${identity.type})`);

                  return;
               }
            }
         }

         return Promise.reject();
      }).catch(() => {
         clientElement.text(Translation.t('Not_available'));
      });
   }

   contact.getVcard()
      .then(function(vcardData){vcardSuccessCallback(vcardData,contact);})
      .then(function(vcardData) {
         let content = vcardBodyTemplate({
            properties: vcardData
         });

         dialog.getDom().append(content);

         dialog.getDom().find('.jsxc-waiting').remove();
      })
      .catch(vcardErrorCallback);
}

function vcardSuccessCallback(vCardData,contact): Promise<any> {
   let dialogElement = dialog.getDom();

   if (vCardData.PHOTO) {
      let imageElement = $('<div>');
      imageElement.addClass('jsxc-avatar jsxc-vcard');
      imageElement.css('background-image', `url(${vCardData.PHOTO.src})`);

      dialogElement.find('h3').before(imageElement);
   }

   let numberOfProperties = Object.keys(vCardData).length;

   return new Promise(function(resolve, reject) {
       contact.getAvatar().then(avatar => {
         let imageElement = $('<div>');
         imageElement.addClass('jsxc-avatar jsxc-vcard');
         imageElement.css('background-image', `url(${avatar.getData()})`);

         dialogElement.find('h3').before(imageElement);

         delete vCardData.PHOTO;

         return Promise.resolve(convertToTemplateData(vCardData));
       }).catch(() => {

        if (numberOfProperties === 0 || (numberOfProperties === 1 && vCardData.PHOTO)) {
            return Promise.reject({});
         }

         delete vCardData.PHOTO;

         return Promise.resolve(convertToTemplateData(vCardData));
      });
   });
}

function vcardErrorCallback() {
   let dialogElement = dialog.getDom();

   dialogElement.find('.jsxc-waiting').remove();

   let content = '<p>';
   content += Translation.t('Sorry_your_buddy_doesnt_provide_any_information');
   content += '</p>';

   dialogElement.append(content);
}

function convertToTemplateData(vCardData): any[] {
   let properties = [];

   for (let name in vCardData) {
      let value = vCardData[name];
      let childProperties;

      if (typeof value === 'object' && value !== null) {
         childProperties = convertToTemplateData(value);
         value = undefined;
      }

      properties.push({
         name: Translation.t(name),
         value,
         properties: childProperties
      });
   }

   return properties;
}
