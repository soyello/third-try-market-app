import { TMessage, TUserWithChat } from '@/helper/type';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Input from './Input';
import ChatHeader from './ChatHeader';
import Message from './Message';

interface ChatProps {
  currentUser: TUserWithChat;
  receiver: {
    receiverId: string;
    receiverName: string;
    receiverImage: string;
  };
  setLayout: (layout: boolean) => void;
}

const Chat = ({ currentUser, receiver, setLayout }: ChatProps) => {
  const [messages, setMessages] = useState<TMessage[]>([]);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef?.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!currentUser || !receiver) return;

    const conversation = currentUser.conversations?.find((conv) => conv.participantIds.includes(receiver.receiverId));

    if (conversation) {
      try {
        const response = await fetch(`/api/messages/${conversation.id}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    }
  }, [currentUser, receiver]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const latestMessage = messages[messages.length - 1] || null;

  if (!receiver.receiverName || !currentUser) {
    return <div className='w-full h-full'></div>;
  }

  return (
    <div className='w-full'>
      <div>
        <ChatHeader
          setLayout={setLayout}
          receiverName={receiver.receiverName}
          receiverImage={receiver.receiverImage}
          lastMessageTime={latestMessage?.createdAt || ''}
        />
      </div>
      <div className='flex flex-col gap-8 p-4 overflow-hidden h-[calc(100vh_-_60px_-_70px_-_80px)]'>
        {messages.map((message) => {
          return (
            <Message
              key={message.id}
              isEnder={message.senderId === currentUser.id}
              messageText={message.text || null}
              messageImage={message.image || null}
              messageName={receiver.receiverName}
              receiverImage={receiver.receiverImage}
              senderImage={currentUser.image}
              time={message.createdAt}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div>
        <Input receiverId={receiver?.receiverId} currentUserId={currentUser?.id} />
      </div>
    </div>
  );
};

export default Chat;
