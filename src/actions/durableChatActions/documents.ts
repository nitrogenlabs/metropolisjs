/** Selection sets are configurable; product policy and response validation belong to the caller. */
export interface DurableChatFields {
  readonly attachment: string;
  readonly conversation: string;
  readonly membership: string;
  readonly message: string;
  readonly invite: string;
  readonly reaction: string;
  readonly receipt: string;
}
export const createDurableChatDocuments = (fields: Partial<DurableChatFields> = {}) => {
  const membership = fields.membership ?? 'conversationId epoch joinSequence leftSequence personaId revision role state';
  const conversation = fields.conversation ?? `activeMemberCount conversationId kind membership{${membership}} membershipRevision name state`;
  const attachment = fields.attachment ?? 'imageId';
  const message = fields.message ?? `attachments{${attachment}} body conversationId createdAt deleted editedAt messageId revision senderPersonaId sequence`;
  const projectedMessage = `${message} quote{${message}}`;
  const invite = fields.invite ?? 'conversationId expiresAt inviteId invitedByPersonaId revision state';
  const reaction = fields.reaction ?? 'emoji personaId';
  const receipt = fields.receipt ?? 'deliveredSequence personaId readSequence readSharing';
  const mutation = (field: string, input: string, result: string) => `mutation($input:${input}!){${field}(input:$input){${result}}}`;
  return {
    acceptInvite: mutation('acceptInvite', 'AcceptInviteInput', conversation),
    changeMemberRole: mutation('changeMemberRole', 'MemberRoleInput', conversation),
    chatContacts: 'query($after:ID,$limit:Int){chatContacts(after:$after,limit:$limit){name personaId}}',
    createDirect: mutation('createDirect', 'CreateDirectInput', conversation),
    createGroup: mutation('createGroup', 'CreateGroupInput', conversation),
    declineInvite: mutation('declineInvite', 'AcceptInviteInput', invite),
    deleteMessage: mutation('deleteMessage', 'DeleteMessageInput', 'messageId revision sequence'),
    editMessage: mutation('editMessage', 'EditMessageInput', 'messageId revision sequence'),
    history: `query($input:HistoryInput!){history(input:$input){eventCursor messages{${projectedMessage}} nextCursor}}`,
    inbox: `query($input:InboxInput!){inbox(input:$input){${conversation} archived muted unreadCount}}`,
    invitations: `query{invitations(limit:50){${invite}}}`,
    inviteMember: mutation('inviteMember', 'InviteMemberInput', invite),
    leaveConversation: mutation('leaveConversation', 'LeaveInput', conversation),
    participants: `query($conversationId:ID!){participants(conversationId:$conversationId){${membership}}}`,
    reactions: `query($input:MessageTarget!){reactions(input:$input){${reaction}}}`,
    receipts: `query($conversationId:ID!){receipts(conversationId:$conversationId){${receipt}}}`,
    removeMember: mutation('removeMember', 'TargetMemberInput', conversation),
    replayEvents: 'query($input:ReplayInput!){replayEvents(input:$input){cursor events{conversationId eventId eventSequence kind resourceId revision} resyncRequired}}',
    sendMessage: mutation('sendMessage', 'SendInput', 'clientMessageId messageId revision sequence'),
    setInboxState: mutation('setInboxState', 'InboxStateInput', 'archived muted'),
    setReaction: mutation('setReaction', 'ReactionInput', reaction),
    setTyping: mutation('setTyping', 'TypingInput', 'expiresAt'),
    socketTicket: 'mutation{socketTicket{expiresAt ticket url}}',
    transferOwnership: mutation('transferOwnership', 'TargetMemberInput', conversation),
    typing: 'query($conversationId:ID!){typing(conversationId:$conversationId){expiresAt personaId}}',
    updateReceipt: mutation('updateReceipt', 'ReceiptInput', receipt)
  } as const;
};
export type DurableChatOperation = keyof ReturnType<typeof createDurableChatDocuments>;
