import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ICommandPalette, DOMUtils } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';

import { submitNotebook, userInfo } from './handler';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'urncjp:plugin',
  description: 'A JupyterLab extension to collect exam files',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    nbtracker: INotebookTracker,
    settingRegistry: ISettingRegistry | null
  ) => {
    console.log('JupyterLab extension urncjp is activated!');

    const { commands } = app;

    const userNode = document.createElement('div');
    userNode.textContent = '';
    const userWidget = new Widget({ node: userNode });
    userWidget.id = DOMUtils.createDomID();
    userWidget.addClass('jp-UserWidget');
    app.shell.add(userWidget, 'top', { rank: 1000 });

    const submitNode = document.createElement('div');
    submitNode.textContent = 'submit';
    const submitWidget = new Widget({ node: submitNode });
    submitWidget.id = DOMUtils.createDomID();
    submitWidget.addClass('jp-SubmitWidget');
    app.shell.add(submitWidget, 'top', { rank: 1000 });

    commands.addCommand('urncjp:submit', {
      label: 'Submit Exam',
      caption: 'Submit the exam to the server',
      execute: () => {
        const current = nbtracker.currentWidget;
        if (!current) {
          console.error('No notebook is active');
          return;
        }
        const panel = current.content;
        const nbData = panel.model?.toJSON();
        if (!nbData) {
          console.error('Failed to get notebook data');
          return;
        }
        const data = nbData as { metadata: { exam?: boolean } };
        if (!data.metadata || !data.metadata.exam) {
          // Not an exam notebook
          console.log('Not an exam notebook. Skipping submission.');
          return;
        }

        submitNotebook(JSON.stringify(nbData))
          .then(data => {
            const { submission } = data;
            const { createdAt, valid } = submission;
            const date = new Date(createdAt).toLocaleString('de-DE');
            if (!valid) {
              submitWidget.node.textContent = 'Exam submissions are closed';
              submitWidget.node.style.backgroundColor = '#1d293d';
            } else {
              submitWidget.node.textContent = `Submitted at ${date}`;
              submitWidget.node.style.backgroundColor = '#006045';
            }
          })
          .catch(error => {
            console.error('Failed to submit notebook:', error);
          });
      }
    });
    commands.addCommand('urncjp:status', {
      label: 'Check Status',
      caption: 'Check the status of the exam',
      execute: () => {
        userInfo().then(data => {
          const { name, sub, display_name } = data;
          userWidget.node.textContent = `Jupyter Exam: ${display_name},  ${name} (${sub})`;
        });
      }
    });

    palette.addItem({
      command: 'urncjp:status',
      category: 'Notebook Operations'
    });

    palette.addItem({
      command: 'urncjp:submit',
      category: 'Notebook Operations'
    });

    nbtracker.currentChanged.connect((_, nbPanel) => {
      if (!nbPanel) {
        return;
      }
      commands.execute('urncjp:status');

      nbPanel.context.saveState.connect((_, state) => {
        if (state === 'completed') {
          commands.execute('urncjp:submit');
        }
      });
    });

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('urncjp settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for urncjp.', reason);
        });
    }
  }
};

export default plugin;
