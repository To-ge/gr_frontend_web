'use client';
import { useState } from 'react';
import { Modal } from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';

type Props = {
  thesisUrl: string;
  slideUrl: string;
};

export default function PaperViewer({ thesisUrl, slideUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  const openModal = (url: string) => {
    setFileUrl(url);
    setOpen(true);
  };

  return (
    <div className="mt-4 space-y-4">
      <div>
        <h2 className="font-bold text-lg mb-2">論文</h2>
        <button
          onClick={() => openModal(thesisUrl)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          論文を見る
        </button>
      </div>

      <div>
        <h2 className="font-bold text-lg mb-2">スライド</h2>
        <button
          onClick={() => openModal(slideUrl)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          スライドを見る
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        center
        showCloseIcon={false}
        styles={{
        modal: {
          width: '80vw', // モーダル自体の最大幅を指定
          maxWidth: 'none',
          padding: '0',
        }
      }}>
        <div className="w-[80vw] h-[80vh]">
        <iframe
            src={fileUrl}
            width="100%"
            height="100%"
            className="border-0"
            style={{
              overflow: 'scroll',
              zoom: 1,
              touchAction: 'manipulation',
            }}
            allow="fullscreen"
          />
        </div>
      </Modal>
    </div>
  );
}
