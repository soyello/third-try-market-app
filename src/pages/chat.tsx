import Chat from '@/components/chat/Chat';
import Contacts from '@/components/chat/Contacts';
import { TUserWithChat } from '@/helper/type';
import getCurrentUser from '@/lib/getCurrentUser';
import axios from 'axios';
import { GetServerSideProps } from 'next';
import { AdapterUser } from 'next-auth/adapters';
import { useState } from 'react';
import useSWR from 'swr';

interface ChatClientProps {
  currentUser?: AdapterUser | null;
}

interface ExtendedAdapterUser extends AdapterUser {
  created_at: string;
  updated_at: string;
}

export const getServerSideProps: GetServerSideProps<ChatClientProps> = async (context) => {
  const { req, res } = context;
  const currentUser = await getCurrentUser(req, res);
  if (!currentUser) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }
  return {
    props: {
      currentUser: { ...currentUser },
    },
  };
};

const ChatPage = ({ currentUser }: ChatClientProps) => {
  const [receiver, setReceiver] = useState<{ receiverId: string; receiverName: string; receiverImage: string }>({
    receiverId: '',
    receiverName: '',
    receiverImage: '',
  });

  const [layout, setLayout] = useState(false);

  const fetcher = (url: string) => axios.get(url).then((res) => res.data);
  const { data: users, error } = useSWR('/api/chat', fetcher, { refreshInterval: 10000 });

  const isLoading = !users && !error;

  const currentUserWithChat = users?.find((user: TUserWithChat) => user.email === currentUser?.email);

  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (error) {
    return <p>Failed to load data.</p>;
  }

  return (
    <>
      <div className='grid grid-cols-[1fr] md:grid-cols-[300px_1fr]'>
        <section className={`${layout ? 'hidden md:flex' : 'flex'}`}>
          <Contacts users={users} currentUser={currentUserWithChat} setLayout={setLayout} setReceiver={setReceiver} />
        </section>
        <section className={`${layout ? 'flex' : 'hidden'}`}>
          <Chat currentUser={currentUserWithChat} receiver={receiver} setLayout={setLayout} />
        </section>
      </div>
    </>
  );
};

export default ChatPage;
