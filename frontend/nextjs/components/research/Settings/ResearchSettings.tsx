'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Upload, Globe, PenTool } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/research/ui/Popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/research/ui/tabs";
import ToneSelector from './ToneSelector';
import FileUpload from './FileUpload';
import { motion } from 'framer-motion';

interface ResearchSettingsProps {
  chatBoxSettings: {
    report_type: string;
    report_source: string;
    tone: string;
  };
  onSettingsChange: (settings: any) => void;
}

export function ResearchSettings({ chatBoxSettings, onSettingsChange }: ResearchSettingsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('source');

  const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...chatBoxSettings, tone: e.target.value });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-4" align="start">
        <Tabs defaultValue="source" className="w-full">
          <TabsList className="grid grid-cols-3 gap-4 mb-4">
            <TabsTrigger 
              value="source" 
              onClick={() => handleTabChange('source')}
              className="flex items-center justify-center"
            >
              <Globe className="mr-2 h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger 
              value="files" 
              onClick={() => handleTabChange('files')}
              className="flex items-center justify-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger 
              value="tone" 
              onClick={() => handleTabChange('tone')}
              className="flex items-center justify-center"
            >
              <PenTool className="mr-2 h-4 w-4" />
              Tone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="source" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_source === 'web' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_source: 'web' })}
                whileHover={{ scale: 1.02 }}
              >
                <Globe className="h-8 w-8 mb-2" />
                <div className="font-medium">Web Search</div>
                <div className="text-sm text-gray-500 text-center">Search across the entire internet</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_source === 'local' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_source: 'local' })}
                whileHover={{ scale: 1.02 }}
              >
                <Upload className="h-8 w-8 mb-2" />
                <div className="font-medium">File Analysis</div>
                <div className="text-sm text-gray-500 text-center">Analyze your uploaded documents</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_source === 'hybrid' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_source: 'hybrid' })}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative h-8 w-8 mb-2">
                  <Upload className="absolute inset-0" />
                  <Globe className="absolute inset-0 opacity-70" />
                </div>
                <div className="font-medium">Hybrid Search</div>
                <div className="text-sm text-gray-500 text-center">Combine web search with your documents</div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <FileUpload />
          </TabsContent>

          <TabsContent value="tone" className="mt-4">
            <div className="p-4">
              <ToneSelector 
                tone={chatBoxSettings.tone} 
                onToneChange={handleToneChange}
              />
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}