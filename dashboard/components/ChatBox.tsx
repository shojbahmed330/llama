
import React from 'react';
import MessageList from './chat/MessageList';
import ChatInput from './chat/ChatInput';

interface ChatBoxProps {
  messages: any[];
  input: string;
  setInput: (s: string) => void;
  isGenerating: boolean;
  currentAction?: string | null;
  handleSend: (extraData?: string) => void;
  mobileTab: 'chat' | 'preview';
  selectedImage: { data: string; mimeType: string; preview: string } | null;
  setSelectedImage: (img: any) => void;
  handleImageSelect: (file: File) => void;
  executionQueue: string[];
  waitingForApproval?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ 
  messages, input, setInput, isGenerating, currentAction, handleSend, mobileTab,
  selectedImage, setSelectedImage, handleImageSelect, executionQueue,
  waitingForApproval
}) => {
  return (
    <section className={`w-full lg:w-[600px] border-r border-white/5 flex flex-col bg-[#09090b] h-full relative ${mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'}`}>
      <MessageList 
        messages={messages} 
        isGenerating={isGenerating} 
        currentAction={currentAction}
        handleSend={handleSend} 
        waitingForApproval={waitingForApproval}
      />

      <ChatInput 
        input={input}
        setInput={setInput}
        isGenerating={isGenerating}
        handleSend={() => handleSend()}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        handleImageSelect={handleImageSelect}
        executionQueue={executionQueue}
      />
    </section>
  );
};

export default ChatBox;
