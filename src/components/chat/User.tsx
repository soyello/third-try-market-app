import { TConversation, TMessage, TUserWithChat } from '@/helper/type';
import React, { useState } from 'react';
import Avatar from '../Avatar';
import { fromNow } from '@/helper/dayjs';

interface UserProps {
  user: TUserWithChat;
  currentUserId: string;
}

const User = ({ user, currentUserId }: UserProps) => {
  const [messages, setMessages] = useState<TMessage[]>([]);
  const conversations = Array.isArray(user.conversations) ? user.conversations : [];
  const conversationWithCurrentUser = conversations.find((conversation: TConversation) =>
    conversation.participantIds.includes(currentUserId)
  );
  const latestMessage = conversationWithCurrentUser?.messages.slice(-1)[0];
  return (
    <div
      className='grid
      grid-cols-[40px_1fr_50px]
      grid-rows-[40px]
      gap-3
      py-3
      border-b-[1px]
      hover:cursor-pointer
      hover:bg-hover
      '
    >
      <div>
        <Avatar src={user.image} />
      </div>
      <div>
        <h3>{user.name}</h3>
        {latestMessage && (
          <p
            className='
              overflow-hidden
              text-xs
              font-medium
              text-gray-600
              break-words
              whitespace-pre-wrap'
          >
            {latestMessage.text}
          </p>
        )}
        {latestMessage && latestMessage.image && (
          <p
            className='
            text-xs
            font-medium
          text-gray-600
          '
          >
            [이미지]
          </p>
        )}
      </div>
      <div className='flex justify-end text-xs text-gray-500'>
        {latestMessage && <p>{fromNow(latestMessage.createdAt)}</p>}
      </div>
    </div>
  );
};

export default User;
