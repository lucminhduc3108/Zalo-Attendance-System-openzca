// src/tools/index.js — merge all 20 tools into ZALO_TOOLS[]
// Messaging (7)
import { sendMessage } from './messaging/sendMessage.js';
import { sendMedia } from './messaging/sendMedia.js';
import { readRecent } from './messaging/readRecent.js';
import { reactMessage } from './messaging/reactMessage.js';
import { deleteMessage } from './messaging/deleteMessage.js';
import { editMessage } from './messaging/editMessage.js';
import { forwardMessage } from './messaging/forwardMessage.js';

// Group (8)
import { createGroupChat } from './group/createGroupChat.js';
import { addGroupMembers } from './group/addGroupMembers.js';
import { removeGroupMembers } from './group/removeGroupMembers.js';
import { renameGroup } from './group/renameGroup.js';
import { listGroups } from './group/listGroups.js';
import { groupInfo } from './group/groupInfo.js';
import { listMembers } from './group/listMembers.js';
import { leaveGroup } from './group/leaveGroup.js';

// Friend (2)
import { searchUsers } from './friend/searchUsers.js';
import { getUserProfile } from './friend/getUserProfile.js';

// DB (2)
import { searchMessages } from './db/searchMessages.js';
import { syncHistory } from './db/syncHistory.js';

// Utility (1)
import { getMyProfile } from './utility/getMyProfile.js';

export const ZALO_TOOLS = [
  // Messaging
  sendMessage,
  sendMedia,
  readRecent,
  reactMessage,
  deleteMessage,
  editMessage,
  forwardMessage,
  // Group
  createGroupChat,
  addGroupMembers,
  removeGroupMembers,
  renameGroup,
  listGroups,
  groupInfo,
  listMembers,
  leaveGroup,
  // Friend
  searchUsers,
  getUserProfile,
  // DB
  searchMessages,
  syncHistory,
  // Utility
  getMyProfile,
];
