'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'oromo' | 'english' | 'amharic' | 'sidama' | 'arabic';

export const UI_TEXT: Record<AppLanguage, {
  home: string; library: string; playlist: string; settings: string;
  nowPlaying: string; browseSongs: string; noSongPlaying: string;
  showLyrics: string; hideLyrics: string; download: string;
  searchPlaceholder: string; newSongs: string; groupSongs: string;
  singleSongs: string; oldSongs: string; noArtistsFound: string;
  artist: string; group: string; appLanguage: string; notifications: string;
  newSongsNotif: string; contact: string; about: string; appName: string;
  version: string; developer: string; installApp: string; installNow: string;
  installDesc: string; moreInQueue: string; telegramChannel: string;
}> = {
  oromo: {
    home: 'Mana', library: 'Kuusaa', playlist: 'Tarree', settings: 'Qindaa\'ina',
    nowPlaying: 'Amma Taphatamaa', browseSongs: 'Faarfannaa Barbaacha', noSongPlaying: 'Faarfannaa hin jiru',
    showLyrics: 'Dubbii Agarsiisi', hideLyrics: 'Dubbii Dhoksi', download: 'Buufadhu',
    searchPlaceholder: 'Faarfannaa, Artist barbaadi...', newSongs: 'Faarfannaa Haaraa',
    groupSongs: 'Garee', singleSongs: 'Dhuunfaa', oldSongs: 'Faarfannaa Durii',
    noArtistsFound: 'Artist hin argamne', artist: 'Artist', group: 'Garee',
    appLanguage: 'Afaan App', notifications: 'Beeksisa', newSongsNotif: 'Faarfannaa haaraa yoo dabalame beeksisi',
    contact: 'Qunnamtii', about: 'Waa\'ee', appName: 'Maqaa App', version: 'Versiyon', developer: 'Hojjetaa',
    installApp: 'App Fayyadami', installNow: 'Amma Fayyadami', installDesc: 'Screen duraa irratti ida\'i',
    moreInQueue: 'tarreetti dabalame', telegramChannel: 'Channel Telegram',
  },
  english: {
    home: 'Home', library: 'Library', playlist: 'Playlist', settings: 'Settings',
    nowPlaying: 'Now Playing', browseSongs: 'Browse Songs', noSongPlaying: 'No song playing',
    showLyrics: 'Show Lyrics', hideLyrics: 'Hide Lyrics', download: 'Download',
    searchPlaceholder: 'Search songs, artists...', newSongs: 'New Songs',
    groupSongs: 'Group Songs', singleSongs: 'Single Songs', oldSongs: 'Old Songs',
    noArtistsFound: 'No artists found', artist: 'Artist', group: 'Group',
    appLanguage: 'App Language', notifications: 'Notifications', newSongsNotif: 'Get notified when new songs are added',
    contact: 'Contact', about: 'About', appName: 'App Name', version: 'Version', developer: 'Developer',
    installApp: 'Install App', installNow: 'Install Now', installDesc: 'Add to home screen for offline use',
    moreInQueue: 'more in queue', telegramChannel: 'Telegram Channel',
  },
  amharic: {
    home: 'ዋና', library: 'ቤተ-መጻህፍት', playlist: 'ዝርዝር', settings: 'ቅንብሮች',
    nowPlaying: 'አሁን እየተጫወተ', browseSongs: 'ዘፈኖችን ያስሱ', noSongPlaying: 'ምንም ዘፈን የለም',
    showLyrics: 'ግጥም አሳይ', hideLyrics: 'ግጥም ደብቅ', download: 'አውርድ',
    searchPlaceholder: 'ዘፈን፣ አርቲስት ይፈልጉ...', newSongs: 'አዲስ ዘፈኖች',
    groupSongs: 'የቡድን ዘፈኖች', singleSongs: 'ነጠላ ዘፈኖች', oldSongs: 'ድሮ ዘፈኖች',
    noArtistsFound: 'አርቲስት አልተገኘም', artist: 'አርቲስት', group: 'ቡድን',
    appLanguage: 'የApp ቋንቋ', notifications: 'ማሳወቂያ', newSongsNotif: 'አዲስ ዘፈኖች ሲጨመሩ ያሳውቅ',
    contact: 'ያግኙን', about: 'ስለ', appName: 'የApp ስም', version: 'ስሪት', developer: 'ገንቢ',
    installApp: 'App ጫን', installNow: 'አሁን ጫን', installDesc: 'ወደ መነሻ ማያ ጨምር',
    moreInQueue: 'በሰልፍ ውስጥ', telegramChannel: 'የቴሌግራም ቻናል',
  },
  sidama: {
    home: 'Mana', library: 'Maktabaa', playlist: 'Tarree', settings: 'Qindaa\'ina',
    nowPlaying: 'Amma Taphatama', browseSongs: 'Faarfannaa Barbaadi', noSongPlaying: 'Faarfannaa yoote',
    showLyrics: 'Dubbii Agarsiisi', hideLyrics: 'Dubbii Dhoksi', download: 'Buufadhu',
    searchPlaceholder: 'Faarfannaa, Artist barbaadi...', newSongs: 'Faarfannaa Haaroo',
    groupSongs: 'Garee', singleSongs: 'Dhuunfaa', oldSongs: 'Faarfannaa Durii',
    noArtistsFound: 'Artist argame dhabu', artist: 'Artist', group: 'Garee',
    appLanguage: 'Afaan App', notifications: 'Beeksisa', newSongsNotif: 'Faarfannaa haaroo dabalamu beeksisi',
    contact: 'Qunnamtii', about: 'Waa\'ee', appName: 'Maqaa App', version: 'Versiyon', developer: 'Hojjetaa',
    installApp: 'App Fayyadami', installNow: 'Amma Fayyadami', installDesc: 'Screen duraa irratti ida\'i',
    moreInQueue: 'tarreetti dabalame', telegramChannel: 'Channel Telegram',
  },
  arabic: {
    home: 'الرئيسية', library: 'المكتبة', playlist: 'قائمة التشغيل', settings: 'الإعدادات',
    nowPlaying: 'يعزف الآن', browseSongs: 'تصفح الأغاني', noSongPlaying: 'لا توجد أغنية',
    showLyrics: 'إظهار الكلمات', hideLyrics: 'إخفاء الكلمات', download: 'تحميل',
    searchPlaceholder: 'ابحث عن أغاني، فنانين...', newSongs: 'أغاني جديدة',
    groupSongs: 'أغاني المجموعة', singleSongs: 'أغاني منفردة', oldSongs: 'أغاني قديمة',
    noArtistsFound: 'لم يتم العثور على فنانين', artist: 'فنان', group: 'مجموعة',
    appLanguage: 'لغة التطبيق', notifications: 'الإشعارات', newSongsNotif: 'إشعار عند إضافة أغاني جديدة',
    contact: 'تواصل معنا', about: 'حول', appName: 'اسم التطبيق', version: 'الإصدار', developer: 'المطور',
    installApp: 'تثبيت التطبيق', installNow: 'ثبت الآن', installDesc: 'أضف إلى الشاشة الرئيسية',
    moreInQueue: 'في قائمة الانتظار', telegramChannel: 'قناة تيليغرام',
  },
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: typeof UI_TEXT['oromo'];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('oromo');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as AppLanguage | null;
    if (saved && UI_TEXT[saved]) setLanguageState(saved);
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: UI_TEXT[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
