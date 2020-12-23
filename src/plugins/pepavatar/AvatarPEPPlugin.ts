import { AbstractPlugin, IMetaData } from '../../plugin/AbstractPlugin'
import PluginAPI from '../../plugin/PluginAPI'
import Contact from '../../Contact'
import Avatar from '../../Avatar'
import AvatarUI from '../../ui/AvatarSet'
import JID from '../../JID'
import Log from '../../util/Log';
import { ContactType } from '@src/Contact.interface';
import Translation from '@util/Translation';
import { IConnection } from '../../connection/Connection.interface'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';


export default class AvatarPEPPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'pep-avatars';
   }

   public static getName(): string {
      return 'PEP-based Avatars';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-pep-avatar-enable'),
         xeps: [{
            id: 'XEP-0084',
            name: 'PEP-Based Avatars',
            version: '1.0',
         }]
      }
   }

   private static instance: AvatarPEPPlugin;

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onMessageAvatarUpdate, 'http://jabber.org/protocol/pubsub#event', 'message');

      pluginAPI.addAvatarProcessor(this.avatarProcessor, 49);
      AvatarPEPPlugin.instance=this;
   }

   public static getInstance()
   {
       return AvatarPEPPlugin.instance;
   }

   public getStorage() {
      return this.pluginAPI.getStorage();
   }

   private onMessageAvatarUpdate = (stanza) => {
      let from = new JID($(stanza).attr('from'));
      let metadata = $(stanza).find('metadata[xmlns="urn:xmpp:avatar:metadata"]');
      let data = $(stanza).find('data[xmlns="urn:xmpp:avatar:data"]');

      if (metadata.length > 0) {
         let info = metadata.find('info');

         if (info.length > 0) {
            let contact = this.pluginAPI.getContact(from);

            if (contact && contact.getType() === ContactType.GROUPCHAT && from.resource) {
               return true;
            }

            if (!contact) {
               this.pluginAPI.Log.warn('No contact found for', from);
               return true;
            }

            let hash = $(info).attr('id');

            let avatardata = this.getStorage().getItem(from.bare);
            if (!avatardata)
            {
                this.getStorage().setItem(from.bare, {"id":hash,
                                                  "type":$(info).attr('type'),
                                                  "width":$(info).attr('width'),
                                                  "height":$(info).attr('height'),
                                                  "bytes":$(info).attr('bytes'), "data":null});
            }
            else
            if (avatardata.id!==hash||avatardata.data===null)
            {
               avatardata={"id":hash,
                          "type":$(info).attr('type'),
                          "width":$(info).attr('width'),
                          "height":$(info).attr('height'),
                          "bytes":$(info).attr('bytes'), "data":null};
               this.getStorage().setItem(from.bare, avatardata);
            }
         }

      }
      else
      if (data.length > 0) {
           let contact = this.pluginAPI.getContact(from);
           if (contact && contact.getType() === ContactType.GROUPCHAT && from.resource) {
               return true;
           }
           let item = $($(stanza).find('items[node="urn:xmpp:avatar:data"]')).find('item[id]')[0];
           let hash = $(item).attr('id');
           let avatardata = this.getStorage().getItem(from.bare);
           if (avatardata.id===hash&&avatardata.data===null)
           {
               avatardata.data=data.text().replace(/[\t\r\n\f]/gi, '');
               this.getStorage().setItem(from.bare, avatardata);
               let avatarUI = AvatarUI.get(contact);
               avatarUI.setAvatar('data:' + avatardata.type + ';base64,' + avatardata.data);
           }
      }

      return true;
   }

   private avatarProcessor = (contact: Contact, avatar: Avatar): Promise<any> => {
      let storage = this.getStorage();
      let avatardata = storage.getItem(contact.getJid().bare);

      if (!avatardata || !avatar) {
            return this.getAvatar(contact.getJid()).then((avatardata: any) => {

                return [contact, new Avatar(avatardata.id, avatardata.type, avatardata.data)];
         }).catch((err) => {
            Log.warn('Error during avatar retrieval', err)
            console.log('Error during avatar retrieval');
            return Promise.reject();
         });
      }

      try {
         avatar = new Avatar(avatardata.id,avatardata.type,avatardata.data);
      } catch (err) {
            Log.warn('Error during avatar retrieval', err)
            console.log('Error during avatar retrieval');
            return Promise.reject();
      }

      return Promise.resolve([contact, avatar]);
   }

   private getAvatar(jid: JID) {
      let connection = this.pluginAPI.getConnection();

      return AvatarPEPPlugin.getAvatarFromPEP(connection,jid, this.getStorage());
   }

   public static getAvatarFromPEP(connection: IConnection,jid: JID, storage) {

      return connection.getPEPService().retrieveItems('urn:xmpp:avatar:metadata',jid.bare).then(function(meta) {

            let metadata = $(meta).find('metadata[xmlns="urn:xmpp:avatar:metadata"]');

            if (metadata.length > 0)
            {
                 let info = metadata.find('info');

                 if (info&&info.length > 0)
                 {
                    let hash = $(info).attr('id');
                    if (hash&&hash.length > 0)
                    {
                        storage.setItem(jid.bare, {"id":hash,
                                                      "type":$(info).attr('type'),
                                                      "width":$(info).attr('width'),
                                                      "height":$(info).attr('height'),
                                                      "bytes":$(info).attr('bytes'), "data":null});

                        return connection.getPEPService().retrieveItems('urn:xmpp:avatar:data',jid.bare).then(function(data) {
                             return new Promise(function(resolve, reject) {
                                if (data&&$(data).text()&&$(data).text().trim().length>0) {
                                   let avatardata = storage.getItem(jid.bare);
                                   avatardata.data= $(data).text().replace(/[\t\r\n\f]/gi, '');
                                   storage.setItem(jid.bare,avatardata);
                                   resolve(avatardata);
                                } else {
                                   reject();
                                }
                             });
                        });
                    }
                 }
            }

            return new Promise(function(resolve, reject) {
                 reject();
            });
      });
   }

   public static setAvatar(connection: IConnection, id: string, data: string, height: string, width: string, mimetype: string, size: string) {

      let item = $build('metadata',{xmlns:'urn:xmpp:avatar:metadata'}).c('info',{"bytes":size,"id":id,"height":height,"width":width,"type":mimetype}).tree();

      return connection.getPEPService().publish('urn:xmpp:avatar:metadata',item,'urn:xmpp:avatar:metadata').then(function(result) {

      let itemdata = $build('data',{xmlns:'urn:xmpp:avatar:data'}).t(data).tree();

           return connection.getPEPService().publish('urn:xmpp:avatar:data',itemdata,'urn:xmpp:avatar:data').then(function(result) {

         return new Promise(function(resolve, reject) {
             resolve(true);
         });

      });

            return new Promise(function(resolve, reject) {
                 reject();
            });
      });
   }

   public static removeAvatar(connection: IConnection) {

      let item = $build('metadata',{xmlns:'urn:xmpp:avatar:metadata'});

      return connection.getPEPService().publish('urn:xmpp:avatar:metadata',item.tree(),'urn:xmpp:avatar:metadata').then(function(result) {
         return new Promise(function(resolve, reject) {
             resolve(true);
         });
      });
   }
}
