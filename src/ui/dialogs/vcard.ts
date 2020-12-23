import Dialog from '../Dialog'
import { IContact } from '../../Contact.interface'
import Translation from '@util/Translation';
import { Presence } from '@connection/AbstractConnection';
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
      .then(function(vcardData){
          return Promise.resolve(vcardSuccessCallback(vcardData,contact));
      })
      .then(function(vcardData) {
         let content = vcardBodyTemplate({
            properties: vcardData
         });

         dialog.getDom().append(content);

         dialog.getDom().find('.jsxc-waiting').remove();
      })
      .catch(error => {
        return vcardErrorCallback(contact);
      });
}

function vcardSuccessCallback(vCardData,contact){
   let dialogElement = dialog.getDom();

   if (vCardData.PHOTO) {
      let imageElement = $('<div>');
      imageElement.addClass('jsxc-avatar jsxc-vcard');
      imageElement.css('background-image', `url(${vCardData.PHOTO.src})`);

      dialogElement.find('h3').before(imageElement);
   }

   let numberOfProperties = Object.keys(vCardData).length;

   let disabledPlugins = contact.getAccount().getOption('disabledPlugins') || [];

   if (disabledPlugins.indexOf('pep-avatars')>=0)
   {
      if (numberOfProperties === 0 || (numberOfProperties === 1 && vCardData.PHOTO)) {
           return Promise.reject({});
      }

      delete vCardData.PHOTO;

      return convertToTemplateData(vCardData);
   }

   return new Promise(function(resolve, reject) {
       contact.getAvatar().then(avatar => {

         let imageElement = $(dialogElement).find('.jsxc-avatar');
         if (imageElement.length===0)
         {
             imageElement = $('<div>');
             imageElement.addClass('jsxc-avatar jsxc-vcard');
             imageElement.css('background-image', `url(${(avatar.getData().startsWith('data:')?avatar.getData():'data:' + avatar.getType() + ';base64,' + avatar.getData())})`);
             dialogElement.find('h3').before(imageElement);
         }
         else
         {
             imageElement.css('background-image','');
             imageElement.removeClass('jsxc-avatar');
             imageElement.addClass('jsxc-circle-double-avatar');

             let imgvcard = $('<img class="jsxc-circle-left-avatar" src="'+vCardData.PHOTO.src+'">');
             let imgpep = $('<img class="jsxc-circle-right-avatar" src="'+(avatar.getData().startsWith('data:')?avatar.getData():'data:' + avatar.getType() + ';base64,' + avatar.getData())+'">');
             imageElement.append(imgpep);
             imageElement.append(imgvcard);
             let avatartypeElement=$('<div class="jsxc-circle-avatar-text">');

             imageElement.append(avatartypeElement);

             dialogElement.find('h3').addClass('jsxc-circle-position-header');
             imgpep.on('mouseover',function(e)
             {
               $(this).css('z-index', '1');
               $(this).css('clip', 'unset');
               avatartypeElement.text('PEP Avatar');
             }).on('mouseout',function(){
               $(this).css('z-index', '');
               $(this).css('clip', '');
               avatartypeElement.text('');
             });

             imgvcard.on('mouseover',function(e)
             {
               $(this).css('z-index', '1');
               $(this).css('clip', 'unset');
               avatartypeElement.text('VCard Avatar');
             }).on('mouseout',function(){
               $(this).css('z-index', '');
               $(this).css('clip', '');
               avatartypeElement.text('');
             });
         }

         delete vCardData.PHOTO;
         let result = convertToTemplateData(vCardData);
         return resolve(result);
       }).catch(() => {

         if (numberOfProperties === 0 || (numberOfProperties === 1 && vCardData.PHOTO)) {
            return reject({});
         }

         delete vCardData.PHOTO;
         let result = convertToTemplateData(vCardData);
         return resolve(result);
      });
   });
}

function vcardErrorCallback(contact) {
   let dialogElement = dialog.getDom();

   dialogElement.find('.jsxc-waiting').remove();

   let content = '<p>';
   content += Translation.t('Sorry_your_buddy_doesnt_provide_any_information');
   content += '</p>';

   dialogElement.append(content);
   let disabledPlugins = Client.getAccountManager().getAccounts()[0].getOption('disabledPlugins') || [];
   if (disabledPlugins.indexOf('pep-avatars')>-1)
   {
      return;
   }
   contact.getAvatar().then(avatar => {

    let imageElement = $('<div>');
       imageElement.addClass('jsxc-avatar jsxc-vcard jsxc-pepavatar');
       imageElement.css('background-image', `url(${(avatar.getData().startsWith('data:')?avatar.getData():'data:' + avatar.getType() + ';base64,' + avatar.getData())})`);
       dialogElement.find('h3').before(imageElement);
    }).catch(msg =>{
      console.log(msg);

   });
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
