import { IContact } from '../Contact.interface'
import Color from '../util/Color'
import Client from '@src/Client';
import { IJID } from '@src/JID.interface';

export default class AvatarSet {

   private elements: JQuery[] = [];

   private static avatars = {};

   public static get(contact: IContact): AvatarSet {
      let avatar = AvatarSet.avatars[contact.getUid()];

      if (!avatar) {
         avatar = AvatarSet.avatars[contact.getUid()] = new AvatarSet(contact);
      }

      return avatar;
   }

   public static setPlaceholder(elements: JQuery, text: string, jid?: IJID) {
      AvatarSet.placeholder(elements, text, jid);
   }

   public addElement(element) {
      this.elements.push(element);

      this.reload();
   }

   public reload() {
      this.showSpinner();

      if (this.contact.getType()!=='groupchat')
      {
        let _self=this;
        this.contact.getAvatar().then((avatar) => {

               if (avatar.getJid()===_self.contact.getJid().bare)
               {
                   /*
                     Sometime a wrong Avatar was loaded.
                     Needs some investigation on this.
                     As a workaround, the Avatar class was extended with the jid as an id to compare with.
                   */
                   _self.setAvatar(avatar.getData().startsWith('data:')?avatar.getData():'data:' + avatar.getType() + ';base64,' + avatar.getData());
               }
         }).catch((msg) => {
             AvatarSet.placeholder(this.elements, this.contact.getName(), this.contact.getJid());
         }).then(() => {
         this.hideSpinner();
       });
      }
      else
      {
         AvatarSet.placeholder(this.elements, this.contact.getName(), this.contact.getJid(),true); //we dont need a Char in MUC
         this.hideSpinner();
      }
   }

   public setAvatar(dataurl) {
      //old method call was buggy and sometimes the property was not set
      //with background-size: contain; chrome does not complain about invalid property anymore!
	  $(this.elements).each(function() {
			$(this).attr('style','background: url(\'' + dataurl + '\'); background-size: contain; background-repeat: no-repeat; background-position:center;');
			$(this).text('');
	  });
   }

   private constructor(private contact: IContact) {
      this.contact.registerHook('name', (name) => {
         this.reload();
      });
   }

   private static placeholder(elements: JQuery|JQuery[], text: string, jid: IJID, val?:Boolean) {
      let avatarPlaceholder = Client.getOption('avatarPlaceholder');

      let color = Color.generate(text);

      $(elements).each(function() {
         avatarPlaceholder($(this), !val?text:'', color, jid);
      });
   }

   public static clear(elements) {
      $(elements).each(function() {
         let element = $(this);

         element.css({
            'background-image': '',
            'background-color': ''
         });

         element.text('');
      });
   }

   private showSpinner() {
      $(this.elements).each(function() {
         $(this).addClass('jsxc-avatar--loading');
      });
   }

   private hideSpinner() {
      $(this.elements).each(function() {
         $(this).removeClass('jsxc-avatar--loading');
      });
   }
}
