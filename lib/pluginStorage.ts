/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import * as apimlStorage from './apimlStorage';


//suppress warning on missing definitions
declare var process: {
  clusterManager: any;
};

export type StorageLocationType = 'local' | 'cluster' | 'ha';

const allowedStorageTypeLocations = ['local', 'cluster', 'ha'];

function isStorageLocationType(locationType: string): locationType is StorageLocationType {
  return allowedStorageTypeLocations.indexOf(locationType) !== -1;
}

function getDefaultLocationType(): StorageLocationType {
  if (apimlStorage.isConfigured()) {
    return 'ha';
  } else if (process.clusterManager) {
    return 'cluster';
  } else {
    return 'local';
  }
}

export interface IPluginStorage {
  get(key: string, locationType?: StorageLocationType): Promise<any>;
  set(key: string, value: any, locationType?: StorageLocationType): Promise<void>;
  delete(key: string, locationType?: StorageLocationType): Promise<void>;
  getAll(locationType?: StorageLocationType): Promise<{ [key: string]: any }>;
  setAll(dict: { [key: string]: any }, locationType?: StorageLocationType): Promise<void>;
  deleteAll(locationType?: StorageLocationType): Promise<void>;
}

export interface ILocalStorage {
  get(key: string, pluginId?: string): any;
  set(key: string, value: any, pluginId?: string): void;
  delete(key: string, pluginId?: string): void;
  getAll(pluginId?: string): any;
  setAll(dict: { [key: string]: any }, pluginId?: string): void;
}

//identical to IPluginStorage at this point, maybe not in the future.
export type IHAStorage = IPluginStorage;

export function PluginStorageFactory(pluginId: string, logger): IPluginStorage {

  const localStorage: ILocalStorage = LocalStorageFactory(pluginId);
  const haStorage = apimlStorage.isConfigured() ? apimlStorage.makeStorageForPlugin(pluginId) : undefined;

  if (process.clusterManager) { // Cluster mode
    process.clusterManager.getStorageAll(pluginId).then(() => {
      /* Then, once the cluster is done creating its own storage, we merge the local one
         with the cluster. This is useful for having storage capability even if clusterManager hasn't
         fully finished yet i. e. at startup, inside an app's constructor */
      process.clusterManager.mergeStorage(pluginId, localStorage.getAll(pluginId));
    });
  }

  return {
    get: (key: string, locationType?:StorageLocationType): Promise<any> => {
      return new Promise((resolve, reject)=> {
        if (locationType===undefined) {
          locationType = getDefaultLocationType();
        } else if (!isStorageLocationType(locationType)) {
          const msg = `Plugin ${pluginId} storage error, unknown locationType given=${locationType}, allowed one of ${allowedStorageTypeLocations.join(', ')}`;
          logger.warn(msg);
          reject(new Error(msg));
          return;
        }

        if (locationType == 'local') {
          resolve(localStorage.get(key));
        } else if (locationType == 'cluster' || locationType == 'ha' && !haStorage) {
          process.clusterManager.getStorageByKey(pluginId, key).then((val) => resolve(val)).catch((e) => reject(e));
        } else if (locationType == 'ha') {
          haStorage.get(key).then((val) => resolve(val)).catch((e) => reject(e));
        }
      });
    },

    set: (key: string, value: any, locationType?:StorageLocationType): Promise<void> => {
      return new Promise((resolve, reject)=> {
        if (locationType===undefined) {
          locationType = getDefaultLocationType();
        } else if (!isStorageLocationType(locationType)) {
          const msg = `Plugin ${pluginId} storage error, unknown locationType given=${locationType}, allowed one of ${allowedStorageTypeLocations.join(', ')}`;
          logger.warn(msg);
          reject(new Error(msg));
          return;
        }

        if (locationType == 'local') {
          resolve(localStorage.set(key, value));
        } else if (locationType == 'cluster' || locationType == 'ha' && !haStorage) {
          process.clusterManager.setStorageByKey(pluginId, key, value).then(() => resolve()).catch((e) => reject(e));
        } else if (locationType == 'ha') {
          haStorage.set(key, value).then(() => resolve()).catch((e) => reject(e));
        }
      });
    },
    
    delete: (key: string, locationType?:StorageLocationType): Promise<void> => {
      return new Promise((resolve, reject)=> {
        if (locationType===undefined) {
          locationType = getDefaultLocationType();
        } else if (!isStorageLocationType(locationType)) {
          const msg = `Plugin ${pluginId} storage error, unknown locationType given=${locationType}, allowed one of ${allowedStorageTypeLocations.join(', ')}`;
          logger.warn(msg);
          reject(new Error(msg));
          return;
        }

        if (locationType == 'local') {
          resolve(localStorage.delete(key));
        } else if (locationType == 'cluster' || locationType == 'ha' && !haStorage) {
          process.clusterManager.deleteStorageByKey(pluginId, key).then(() => resolve()).catch((e) => reject(e));
        } else if (locationType == 'ha') {
          haStorage.delete(key).then(() => resolve()).catch((e) => reject(e));
        }
      });
    },
                         
    getAll: (locationType?:StorageLocationType): Promise<{ [key: string]: any }> => {
      return new Promise((resolve, reject)=> {
        if (locationType===undefined) {
          locationType = getDefaultLocationType();
        } else if (!isStorageLocationType(locationType)) {
          const msg = `Plugin ${pluginId} storage error, unknown locationType given=${locationType}, allowed one of ${allowedStorageTypeLocations.join(', ')}`;
          logger.warn(msg);
          reject(new Error(msg));
          return;
        }

        if (locationType == 'local') {
          resolve(localStorage.getAll());
        } else if (locationType == 'cluster' || locationType == 'ha' && !haStorage) {
          process.clusterManager.getStorageAll(pluginId).then((dict) => resolve(dict)).catch((e) => reject(e));
        } else if (locationType == 'ha') {
          haStorage.getAll().then((dict) => resolve(dict)).catch((e) => reject(e));
        }
      });
    },
                         
    setAll: (dict:any, locationType?:StorageLocationType): Promise<void> => {
      return new Promise((resolve, reject)=> {
        if (locationType===undefined) {
          locationType = getDefaultLocationType();
        } else if (!isStorageLocationType(locationType)) {
          const msg = `Plugin ${pluginId} storage error, unknown locationType given=${locationType}, allowed one of ${allowedStorageTypeLocations.join(', ')}`;
          logger.warn(msg);
          reject(new Error(msg));
          return;
        }

        if (locationType == 'local') {
          resolve(localStorage.setAll(dict));
        } else if (locationType == 'cluster' || locationType == 'ha' && !haStorage) {
          process.clusterManager.setStorageAll(pluginId, dict).then(() => resolve()).catch((e) => reject(e));
        } else if (locationType == 'ha') {
          haStorage.setAll(dict).then(() => resolve()).catch((e) => reject(e));
        }
      });
    },

    deleteAll: (locationType?:StorageLocationType): Promise<void> => {
      return new Promise((resolve, reject)=> {
        if (locationType===undefined) {
          locationType = getDefaultLocationType();
        } else if (!isStorageLocationType(locationType)) {
          const msg = `Plugin ${pluginId} storage error, unknown locationType given=${locationType}, allowed one of ${allowedStorageTypeLocations.join(', ')}`;
          logger.warn(msg);
          reject(new Error(msg));
          return;
        }

        if (locationType == 'local') {
          resolve(localStorage.setAll({}));
        } else if (locationType == 'cluster' || locationType == 'ha' && !haStorage) {
          process.clusterManager.setStorageAll(pluginId, {}).then(() => resolve()).catch((e) => reject(e));
        } else if (locationType == 'ha') {
          haStorage.deleteAll().then(() => resolve()).catch((e) => reject(e));
        }
      });
    }
  }
}

export function LocalStorageFactory(id?: string): ILocalStorage {
  const storageDict = {};
    
  if (id) {
    storageDict[id] = {};
  }

  return {
    get: (key:string, pluginId?:string): any => {
      const identifier = pluginId || id;
      
      if (storageDict[identifier]) { // If plugin storage exists
        if (storageDict[identifier][key]) { // and if the value, from key, exists
          return storageDict[identifier][key]; // return the value.
        } else {
          return null;
        }
      }
      return null;
    },

    getAll: (pluginId?:string): { [key: string]: any } => {
      if (pluginId === undefined) {
        if (id) { // This was set previously above
          return storageDict[id];
        } else {
          return storageDict;
        }
      }
      
      if (storageDict[pluginId]) { // However, this we need to check if exists
        return storageDict[pluginId];
      }
      
      /* Otherwise, return an empty set. This isn't null because null breaks things in the top-most layer (i.e. webapp, cluster)*/
      return {};
    },

    set: (key:string, value:any, pluginId?:string): void => {
      const identifier = pluginId || id;

      if (identifier) {
        // Are we attempting to put something inside storage that doesn't exist?
        if (storageDict[identifier] === undefined) {
          storageDict[identifier] = {}; // So then make the storage
        }

        storageDict[identifier][key] = value;
      } else {
        console.warn("No specified plugin identifier to set storage value");
      }
    },

    setAll: (dict:any, pluginId?:string): void => {
      const identifier = pluginId || id;

      if (identifier) {
        storageDict[identifier] = dict; // Set the whole storage object
      } else {
        console.warn("No specified plugin identifier to set storage value");
      }
    },

    delete: (key, pluginId): void => {
      const identifier = pluginId || id;

      if (storageDict[identifier]) { // If plugin storage exists
        if (storageDict[identifier][key]) { // and if the value, from key, exists
          delete storageDict[identifier][key]; // remove as desired.
        } else {
          console.warn("Storage for key '" + key + "' doesn't exist or has been already deleted");
        }
      } else {
        console.warn("Storage for id '" + identifier + "' doesn't exist or has been already deleted");
      }
    }
  }
}

