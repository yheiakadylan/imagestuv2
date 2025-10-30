import React, { useState, useContext, useEffect } from 'react';
import { AppSettingsContext } from '../../contexts/AppSettingsContext';
import Button from '../common/Button';
import TextArea from '../common/TextArea';
import ToggleSwitch from '../common/ToggleSwitch';
import Spinner from '../common/Spinner';

const AnnouncementPanel: React.FC = () => {
    const { settings, updateAppSettings } = useContext(AppSettingsContext);
    const [text, setText] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (settings) {
            setText(settings.announcementText || '');
            setIsEnabled(settings.announcementEnabled || false);
        }
    }, [settings]);
    
    const handleSave = async () => {
        setIsSaving(true);
        setStatus('');
        try {
            await updateAppSettings({
                announcementText: text,
                announcementEnabled: isEnabled
            });
            setStatus('Settings saved successfully!');
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            setStatus('Failed to save settings.');
             setTimeout(() => setStatus(''), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Announcement Banner</h3>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                     <h4 className="font-bold">Banner Status</h4>
                     <ToggleSwitch enabled={isEnabled} onChange={setIsEnabled} label={isEnabled ? "Enabled" : "Disabled"} />
                </div>

                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Banner Text</label>
                    <TextArea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="h-32"
                        placeholder="Enter announcement text here. If it's long, it will scroll."
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Spinner className="mr-2"/> Saving...</> : 'Save Settings'}
                    </Button>
                    {status && <p className="text-sm text-green-400">{status}</p>}
                </div>
            </div>
        </div>
    );
};

export default AnnouncementPanel;
