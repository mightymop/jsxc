import Dialog from '../Dialog'
import Client from '../../Client'
//import JID from '../../JID'

let exstatusTemplate = require('../../../template/exstatus.hbs');

let dialog: Dialog;

export default function() {

   let content = exstatusTemplate();

   dialog = new Dialog(content);
   let dom = dialog.open();

   $(dom).ready(function(){
    getStatus();
   });

   dom.find('form').submit(onSubmit);

   $('.jsxc-js-clear').on('click',removeStatus);
}

function onSubmit()
{
   let account = Client.getAccountManager().getAccounts()[0];
   let statustext = dialog.getDom().find('#extended_status_text').val().toString();
   let item = $build('status',{xmlns:'http://jabber.org/protocol/status'}).c('text').t(statustext).tree();

   account.getContact().setStatus(statustext);

   account.getConnection().getPEPService().publish('http://jabber.org/protocol/status',item,'current').then(function(result) {
         dialog.close();
   });

   let targetPresence = Client.getPresenceController().getTargetPresence();
   let con = account.getConnection();
   con.sendPresence(targetPresence,statustext);
   dialog.close();
}

function getStatus()
{
     let account = Client.getAccountManager().getAccounts()[0];
     let contact = account.getContact();
     let jid = contact.getJid();
     account.getConnection().getPEPService().retrieveItems('http://jabber.org/protocol/status',jid.bare).then(function(data) {
         dialog.getDom().find('#extended_status_text').val($(data).text());
    });
}

function removeStatus(ev) {
   ev.preventDefault();

   let account = Client.getAccountManager().getAccounts()[0];
   let item = $build('status',{xmlns:'http://jabber.org/protocol/status'}).tree();

   account.getConnection().getPEPService().publish('http://jabber.org/protocol/status',item,'current').then(function(result) {
        dialog.close();
   });

   let targetPresence = Client.getPresenceController().getTargetPresence();
   let con = account.getConnection();
   con.sendPresence(targetPresence,'');

   dialog.close();
}