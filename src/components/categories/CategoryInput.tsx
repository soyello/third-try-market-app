import { IconType } from 'react-icons';
import React from 'react';

interface CategoryInputProps {
  icon: IconType;
  label: string;
  selected?: boolean;
  onClick: () => void;
}

const CategoryInput = ({ icon: Icon, label, selected, onClick }: CategoryInputProps) => {
  return (
    <div
      onClick={() => onClick()}
      className={`
      rounded-xl
      border-2
      p-4
      flex
      flex-col
      gap-3
      hover:border-secondary
      transition
      cursor-pointer
      ${selected ? 'border-hover' : 'border-neutral-200'}
      `}
    >
      <Icon size={30} />
      <div className='font-semibold'>{label}</div>
    </div>
  );
};

export default CategoryInput;
