import Image from 'next/image';

interface AvatarProps {
  src: string | null;
}

const Avatar = ({ src }: AvatarProps) => {
  return (
    <Image
      className='rounded-full'
      height={30}
      width={30}
      alt='Avatat'
      src={src || 'https://picsum.photos/300/300'}
      priority={true}
    />
  );
};

export default Avatar;
