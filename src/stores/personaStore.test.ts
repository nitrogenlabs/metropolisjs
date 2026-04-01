import {PERSONA_CONSTANTS, initialPersonaState, personaStore} from './personaStore';

describe('personaStore', () => {
  it('should have expected PERSONA_CONSTANTS values', () => {
    expect(PERSONA_CONSTANTS.ADD_ITEM_ERROR).toBe('PERSONA_ADD_ITEM_ERROR');
    expect(PERSONA_CONSTANTS.ADD_ITEM_SUCCESS).toBe('PERSONA_ADD_ITEM_SUCCESS');
    expect(PERSONA_CONSTANTS.DELETE_ITEM_ERROR).toBe('PERSONA_DELETE_ITEM_ERROR');
    expect(PERSONA_CONSTANTS.DELETE_ITEM_SUCCESS).toBe('PERSONA_DELETE_ITEM_SUCCESS');
    expect(PERSONA_CONSTANTS.GET_ITEM_ERROR).toBe('PERSONA_GET_ITEM_ERROR');
    expect(PERSONA_CONSTANTS.GET_ITEM_SUCCESS).toBe('PERSONA_GET_ITEM_SUCCESS');
    expect(PERSONA_CONSTANTS.GET_LIST_ERROR).toBe('PERSONA_GET_LIST_ERROR');
    expect(PERSONA_CONSTANTS.GET_LIST_SUCCESS).toBe('PERSONA_GET_LIST_SUCCESS');
    expect(PERSONA_CONSTANTS.UPDATE_ITEM_ERROR).toBe('PERSONA_UPDATE_ITEM_ERROR');
    expect(PERSONA_CONSTANTS.UPDATE_ITEM_SUCCESS).toBe('PERSONA_UPDATE_ITEM_SUCCESS');
  });

  it('should have expected initialPersonaState structure', () => {
    expect(initialPersonaState).toEqual({
      error: undefined,
      list: [],
      listMap: {}
    });
  });

  it('should have personaStore function', () => {
    expect(typeof personaStore).toBe('function');
  });

  it('should handle personaStore with ADD_ITEM_SUCCESS', () => {
    const initialState = {...initialPersonaState};
    const action = {
      persona: {name: 'test-name', personaId: 'test-id'},
      type: PERSONA_CONSTANTS.ADD_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with GET_ITEM_SUCCESS', () => {
    const initialState = {...initialPersonaState};
    const action = {
      persona: {name: 'test-name', personaId: 'test-id'},
      type: PERSONA_CONSTANTS.GET_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with GET_LIST_SUCCESS', () => {
    const initialState = {...initialPersonaState};
    const action = {
      personas: [
        {name: 'test-name-1', personaId: 'test-id-1'},
        {name: 'test-name-2', personaId: 'test-id-2'}
      ],
      type: PERSONA_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with UPDATE_ITEM_SUCCESS', () => {
    const initialState = {...initialPersonaState};
    const action = {
      persona: {name: 'updated-name', personaId: 'test-id'},
      type: PERSONA_CONSTANTS.UPDATE_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with DELETE_ITEM_SUCCESS', () => {
    const initialState = {...initialPersonaState};
    const action = {
      persona: {personaId: 'test-id'},
      type: PERSONA_CONSTANTS.DELETE_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with error actions', () => {
    const initialState = {...initialPersonaState};
    const errorActions = [
      PERSONA_CONSTANTS.ADD_ITEM_ERROR,
      PERSONA_CONSTANTS.GET_ITEM_ERROR,
      PERSONA_CONSTANTS.GET_LIST_ERROR,
      PERSONA_CONSTANTS.UPDATE_ITEM_ERROR,
      PERSONA_CONSTANTS.DELETE_ITEM_ERROR
    ];

    for(const errorType of errorActions) {
      const action = {
        error: new Error('Test error'),
        type: errorType
      };

      const result = personaStore(initialState, action);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    }
  });

  it('should handle personaStore with unknown action type', () => {
    const initialState = {...initialPersonaState};
    const action = {
      type: 'UNKNOWN_ACTION'
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with empty personas array', () => {
    const initialState = {...initialPersonaState};
    const action = {
      personas: [],
      type: PERSONA_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with null persona data', () => {
    const initialState = {...initialPersonaState};
    const action = {
      persona: null,
      type: PERSONA_CONSTANTS.GET_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with undefined persona data', () => {
    const initialState = {...initialPersonaState};
    const action = {
      persona: undefined,
      type: PERSONA_CONSTANTS.GET_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with complex persona data', () => {
    const initialState = {...initialPersonaState};
    const complexPersona = {
      bio: 'Test bio',
      email: 'test@example.com',
      name: 'Test Name',
      phone: '123-456-7890',
      personaId: 'test-id'
    };
    const action = {
      persona: complexPersona,
      type: PERSONA_CONSTANTS.ADD_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with multiple personas', () => {
    const initialState = {...initialPersonaState};
    const multiplePersonas = [
      {bio: 'Bio 1', name: 'Name 1', personaId: 'id-1'},
      {bio: 'Bio 2', name: 'Name 2', personaId: 'id-2'},
      {bio: 'Bio 3', name: 'Name 3', personaId: 'id-3'}
    ];
    const action = {
      personas: multiplePersonas,
      type: PERSONA_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with existing state', () => {
    const initialState = {
      error: undefined,
      list: [{name: 'existing-name', personaId: 'existing-id'}],
      listMap: {'existing-id': {name: 'existing-name', personaId: 'existing-id'}}
    };
    const action = {
      persona: {name: 'new-name', personaId: 'new-id'},
      type: PERSONA_CONSTANTS.ADD_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle personaStore with error in existing state', () => {
    const initialState = {
      error: new Error('Previous error'),
      list: [],
      listMap: {}
    };
    const action = {
      persona: {name: 'test-name', personaId: 'test-id'},
      type: PERSONA_CONSTANTS.ADD_ITEM_SUCCESS
    };

    const result = personaStore(initialState, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
