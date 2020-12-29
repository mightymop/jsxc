import Dialog from '../Dialog'
import Translation from '../../util/Translation'
import Client from '../../Client'
import BlockingCommandPlugin from '../../plugins/BlockingCommandPlugin'

let contactBlockList = require('../../../template/contactBlock.hbs');

export default function() {
   let content = contactBlockList({});

   let dialog = new Dialog(content);

   let account = Client.getAccountManager().getAccounts()[0];
   let connection = account.getConnection();
   let items;

   BlockingCommandPlugin.getInstance().getBlocklist()
      .then(function(stanza){
          if ($(stanza).attr('type')==='result')
          {
              dialog.open();
              items = $(stanza).find('item');
              initSubmit(dialog, items, connection);
              let textfield = dialog.getDom().find('textarea[name="jsxc-blocklist-textarea"]');
              let blockJids = items.map((_, item) => $(item).attr('jid')).get();
              textfield.val(blockJids.join('\n'));
          }
          else
          {
              alert(Translation.t('UNKNOWN_ERROR'));
          }
    });
}

function initSubmit(dialog: Dialog, items, connection)
{
    dialog.getDom().find('form').on('submit', (ev) => {
      ev.preventDefault();
      let saveitems = dialog.getDom().find('textarea[name="jsxc-blocklist-textarea"]').val().toString().split('\n').map(item => item.trim())
      saveitems=saveitems.filter(item => item.length>0);

     //first unblock then block
      BlockingCommandPlugin.getInstance().unblock(connection.getJID(), []).then(function(stanza){

              if ($(stanza).attr('type')==='result')
              {
    //add some result info?
              }
              else
              {
                  alert(Translation.t('UNKNOWN_ERROR'));
              }
      });

	  if (saveitems.length>0)
	  {
          BlockingCommandPlugin.getInstance().block(connection.getJID(), saveitems).then(function(stanza){
			  if ($(stanza).attr('type')==='result')
			  {
	//add some result info?
			  }
			  else
			  {
				  alert(Translation.t('UNKNOWN_ERROR'));
			  }
		  });
	  }

      dialog.close();
   });
}