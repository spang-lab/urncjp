import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { requestAPI } from './handler';

/**
 * Initialization data for the urncjp extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'urncjp:plugin',
  description: 'Jupyter extension for urnc',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension urncjp is activated!');

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

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The urncjp server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
