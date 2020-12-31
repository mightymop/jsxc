import Dialog from '../Dialog'
import AvatarPEPPlugin from '../../plugins/pepavatar/AvatarPEPPlugin'
import Client from '../../Client'
import * as sha1 from 'js-sha1'
import Contact from '../../Contact'
import Translation from '@util/Translation';

let pepavatarTemplate = require('../../../template/pepavatar.hbs');

let dialog: Dialog;
let base64data : string;
let mimetype : string;
let size : string;
let height: string;
let width: string;
let hash: string;

export default function() {

   let content = pepavatarTemplate();

   dialog = new Dialog(content);
   let dom = dialog.open();

   $(dom).ready(function(){
      $('#jsxc-avatarupload').click(function(){
        $(this).val('');
      });

      $('#jsxc-avatarupload').change(function(event){
        let file = (<HTMLInputElement>document.getElementById('avatarupload')).files[0];
        handleFileSelect(file);
       });

        let disabledPlugins = account.getOption('disabledPlugins') || [];
        if (disabledPlugins.indexOf('pep-avatars')>-1)
        {
            $('#jsxc-avatarupload').css('display','none');
            $('.jsxc-js-submit').css('display','none');
            $('.jsxc-js-clear').css('display','none');
            $('label[for="avatarupload"]').text( Translation.t('xep84disabled'));
            $('h3').text('VCard Avatar');
            $('button.jsxc-js-close').text( Translation.t('Close'));
        }
        else
        {
            $('#jsxc-avatarupload').css('display','');
            $('.jsxc-js-submit').css('display','');
            $('.jsxc-js-clear').css('display','');
            $('label[for="avatarupload"]').css('display','');
        }
   });
   let account = Client.getAccountManager().getAccounts()[0];
   let contact = account.getContact();

   contact.getAvatar().then((avatar) => {
      $('#jsxc-avatarimage').attr('src','data:' + avatar.getType() + ';base64,' + avatar.getData());
      $('#jsxc-avatarimage').css('display','');
   }).catch((msg) => {

      let account = Client.getAccountManager().getAccounts()[0];
      let disabledPlugins = account.getOption('disabledPlugins') || [];
      if (disabledPlugins.indexOf('pep-avatars')===-1)
      {
            let storage=AvatarPEPPlugin.getInstance().getStorage();

            AvatarPEPPlugin.getAvatarFromPEP( account.getConnection(), (<Contact>contact),storage).then((avatar) => {
            let result = (<any>avatar);
            $('#jsxc-avatarimage').attr('src','data:' + result.type + ';base64,' + result.data);
            $('#jsxc-avatarimage').css('display','');
         }).catch((msg2) => {
            $('#jsxc-avatarimage').css('display','none');
         }).then(() => {
         });
      }
      else
      {
          contact.getVcard().then(function(vcardData) {
               let data = (vcardData as any);
               $('#jsxc-avatarimage').attr('src',data.PHOTO.src);
               $('#jsxc-avatarimage').css('display','');
          })
         .catch((msg) => {});
      }
   }).then(() => {
   });

  dom.find('form').submit(onSubmit);

  $('.jsxc-js-clear').on('click',removeAvatar);
}

function handleFileSelect(file) {

  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('The File APIs are not fully supported in this browser.');
    return;
  }

  let fr = new FileReader();
  fr.onload = receivedData;
  //fr.readAsBinaryString(file)
  fr.readAsDataURL(file);
}

function receivedData(result) {

  let img = (<HTMLImageElement>document.getElementById('jsxc-avatarimage'));

   img.onload = function() {
    let canvas = (<HTMLCanvasElement>document.getElementById('canvas'));

    let account = Client.getAccountManager().getAccounts()[0];
    let disabledPlugins = account.getOption('disabledPlugins') || [];

    let h=0;
    let w=0;
    if (disabledPlugins.indexOf('pep-avatars')===-1)
    {
      h = img.width<img.height?192*(img.height/img.width):192;
      w = img.width>=img.height?192*(img.width/img.height):192;
    }
    else
    {
      h = img.width<img.height?64*(img.height/img.width):64;
      w = img.width>=img.height?64*(img.width/img.height):64;
    }

    let ctx = canvas.getContext('2d');

     canvas.height = h;
     canvas.width =  w;
     ctx.drawImage(img, 0, 0, w, h);

     height = h.toString();
     width  = w.toString();

    // SEND THIS DATA TO WHEREVER YOU NEED IT
     let dataurl = canvas.toDataURL('image/png',0.7);
     base64data=dataurl.substring(dataurl.indexOf('base64,')+7);

     mimetype=dataurl.substring(5,dataurl.indexOf(';',6));
     hash = calculateHash(dataurl);
     let data=atob(base64data);
     size=data.length.toString();

     $(img).attr('src', dataurl);//converted image in variable 'data'*/
     img.onload=null;
     img.width=canvas.width;
     img.height=canvas.height;
     $(img).attr('style', 'min-height:'+height+'px !important; margin-left: auto; margin-right: auto; min-width:'+width+
    'px !important; max-height:'+height+'px !important; max-width:'+width+'px !important; height:'+height+'px !important; width:'+width+'px !important;');

    $(img).css('display','');
  }
  img.src = result.target.result;
}

function removeAvatar()
{
    let account = Client.getAccountManager().getAccounts()[0];
    let disabledPlugins = account.getOption('disabledPlugins') || [];

    if (disabledPlugins.indexOf('pep-avatars')===-1)
    {
        AvatarPEPPlugin.removeAvatar(account.getConnection());
    }
    else
    {
        //TODO
        //delete vcard avatar
    }

    dialog.close();
}

function onSubmit(ev) {
   ev.preventDefault();

   let account = Client.getAccountManager().getAccounts()[0];
   let disabledPlugins = account.getOption('disabledPlugins') || [];

   if (disabledPlugins.indexOf('pep-avatars')===-1)
   {
       AvatarPEPPlugin.setAvatar(account.getConnection(),hash,base64data, height, width, mimetype, size);
   }
   else
   {
       //TODO
       //submit vcard avatar
   }

   dialog.close();
}

function calculateHash(data: string): string {
  let base64 = data.replace(/^.+;base64,/, '');
  let buffer = base64ToArrayBuffer(base64);

  return sha1(buffer);
}

function base64ToArrayBuffer(base64String) {
  let binaryString = window.atob(base64String);
  let bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}