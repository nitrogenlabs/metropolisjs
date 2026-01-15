/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {Flux} from '@nlabs/arkhamjs';

import {groups} from '../../stores/groupStore.js';
import {createGroupActions} from './groupActions.js';

describe('createGroupActions', () => {
  let flux: any;
  let groupActions: any;

  beforeEach(() => {
    flux = Flux.init({
      stores: [groups]
    });

    groupActions = createGroupActions(flux);
  });

  describe('groupActions factory', () => {
    it('should create groupActions with all methods', () => {
      expect(groupActions).toBeDefined();
      expect(typeof groupActions.add).toBe('function');
      expect(typeof groupActions.get).toBe('function');
      expect(typeof groupActions.getList).toBe('function');
      expect(typeof groupActions.update).toBe('function');
      expect(typeof groupActions.delete).toBe('function');
      expect(typeof groupActions.updateGroupAdapter).toBe('function');
      expect(typeof groupActions.updateGroupAdapterOptions).toBe('function');
    });
  });

  describe('adapter options', () => {
    it('should allow updating group adapter', () => {
      const customAdapter = (input: unknown) => input;
      groupActions.updateGroupAdapter(customAdapter);
      expect(groupActions.updateGroupAdapter).toBeDefined();
    });

    it('should allow updating group adapter options', () => {
      const options = {strict: true};
      groupActions.updateGroupAdapterOptions(options);
      expect(groupActions.updateGroupAdapterOptions).toBeDefined();
    });
  });
});
