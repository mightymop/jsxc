import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import { IJID } from '../JID.interface';
import Translation from '@util/Translation';
import { IContact } from '@src/Contact.interface';
import { IMessage } from '@src/Message.interface';
import { Status } from '../vendor/Strophe'
import showContactBlockDialog from '../ui/dialogs/contactBlock'
import Roster from '../ui/Roster'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const NAMESPACE_BLOCKING_COMMAND = 'urn:xmpp:blocking'

export default class BlockingCommandPlugin extends AbstractPlugin {

   private blocklist : string[];
   private static instance: BlockingCommandPlugin;

   public static getId(): string {
      return 'blocking-command';
   }

   public static getName(): string {
      return 'Blocking Command';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-vcard-avatar-enable'),
         xeps: [{
            id: 'XEP-0191',
            name: 'Blocking Command',
            version: '1.3',
         }]
      }
   }

   public static getInstance()
   {
       return BlockingCommandPlugin.instance;
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let connection = pluginAPI.getConnection();

      BlockingCommandPlugin.instance=this;

      pluginAPI.addFeature(NAMESPACE_BLOCKING_COMMAND);

      connection.registerHandler(this.onReceiveBlockingItems, NAMESPACE_BLOCKING_COMMAND, 'iq');

      let _self = this;
      pluginAPI.registerConnectionHook((status, condition) => {
         if (status === Status.ATTACHED) {
             // result in onReceiveBlockingItems
            _self.getBlocklist();
         }
      });

      pluginAPI.addAfterReceiveMessageProcessor(this.onMessageIncomingProcessor);

      let roster = Roster.get();

      if ($('.jsxc-block-contacts').length===0)
      {
            roster.addMenuEntry({
                 id: 'block-contacts',
                 handler: showContactBlockDialog,
                 label: Translation.t('Blocking_users')
            });
      }
   }

    public getBlocklist(): Promise<{}>
   {
      let iq = $iq({
         type: 'get'
      }).c('blocklist', {
         xmlns: NAMESPACE_BLOCKING_COMMAND
      });

      return this.pluginAPI.sendIQ(iq);
   }

   // sending an empty block does not make sence
   public block(jid: IJID, items: string[]): Promise<{}>
   {
      if (!items||items.length===0)
      {
          return Promise.reject();
      }

      let iq = $iq({
         to: jid.bare,
         type: 'set'
      }).c('block', {
         xmlns: NAMESPACE_BLOCKING_COMMAND
      });

      for (let itm of items)
      {
        iq.c('item', {jid:itm}).up();
      }

      return this.pluginAPI.sendIQ(iq);
   }

   // sending an empty unblock tag will unblock all!
   public unblock(jid: IJID, items: string[]): Promise<{}>
   {
      let iq = $iq({
         to: jid.bare,
         type: 'set'
      }).c('unblock', {
         xmlns: NAMESPACE_BLOCKING_COMMAND
      });

      for (let itm of items)
      {
        iq.c('item', {jid:itm}).up();
      }

      return this.pluginAPI.sendIQ(iq);
   }


   private onMessageIncomingProcessor = (contact: IContact, message: IMessage, stanza: Element): Promise<[IContact, IMessage, Element]> => {
      let strfrom = $(stanza).attr('from');
      if (strfrom.indexOf('/')>=0)
      {
          strfrom=strfrom.substring(0,strfrom.lastIndexOf('/'));
      }

      if (this.blocklist.indexOf(strfrom)!==-1){
           message.setPlaintextMessage('');
           message.setHtmlMessage('');
      }

      return Promise.resolve([contact, message, stanza]);
   };

   private onReceiveBlockingItems = (stanza) => {

      let _self=this;

      if ($(stanza).children('blocklist').length>0)
      {
          this.blocklist=[];

          $(stanza).find('blocklist > item').each(function(index,item){
              _self.blocklist.push($(item).attr('jid'));

              //DISABLE ROSTER ITEM
              let liItem = $('.jsxc-roster-item.jsxc-bar[data-id="'+$(item).attr('jid')+'"]');
              liItem.addClass('jsxc-rosteritem-disabled');
          });
      }

      if ($(stanza).children('unblock').length>0)
      {
          $(stanza).find('unblock > item').each(function(index,item){
              _self.blocklist.splice(_self.blocklist.indexOf($(item).attr('jid')),1);

              //ENABLE ROSTER ITEM
              let liItem =$('.jsxc-roster-item.jsxc-bar[data-id="'+$(item).attr('jid')+'"]');
              liItem.removeClass('jsxc-rosteritem-disabled');
          });
      }

      if ($(stanza).children('block').length>0)
      {
           $(stanza).find('block > item').each(function(index,item){
               _self.blocklist.push($(item).attr('jid'));

               //DISABLE ROSTER ITEM
               let liItem = $('.jsxc-roster-item.jsxc-bar[data-id="'+$(item).attr('jid')+'"]');
               liItem.addClass('jsxc-rosteritem-disabled');
           });
      }

      return true;
   }
}
