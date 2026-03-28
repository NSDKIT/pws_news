import React, { useState } from 'react';
import { NewsItem } from '../types';
import { ExternalLink, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight flex-1 group-hover:text-blue-700 transition-colors">
            {item.title}
          </h3>
          <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider whitespace-nowrap">
            {item.source}
          </span>
        </div>
        
        <p className="text-sm sm:text-base text-gray-600 mb-6 line-clamp-2 leading-relaxed">
          {item.summary}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
            全文を読む <ChevronRight className="w-4 h-4" />
          </span>
          {item.publishedAt && (
            <span className="text-xs text-gray-400">
              {item.publishedAt}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                    {item.source}
                  </span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-10">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-8 leading-tight">
                  {item.title}
                </h2>

                <div className="space-y-8">
                  <section>
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">要約</h4>
                    <p className="text-lg text-gray-700 leading-relaxed font-medium">
                      {item.summary}
                    </p>
                  </section>

                  <div className="h-px bg-gray-100 w-full" />

                  <section>
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">詳細・全文翻訳</h4>
                    <div className="text-gray-600 leading-relaxed space-y-4 whitespace-pre-wrap">
                      {item.fullContent}
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="text-xs text-gray-400 italic">
                  ※AIによる自動翻訳・要約です。正確な情報は原文をご確認ください。
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  原文サイトで読む <ExternalLink className="ml-2 w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
