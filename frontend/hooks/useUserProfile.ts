import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface UserProfile {
  id: number;
  nickname: string;
  email: string;
  is_expert: boolean;
  profile_image_url?: string;
  created_at: string;
}

export const useUserProfile = () => {
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = () => {
    if (status !== 'authenticated') return;
    
    setLoading(true);
    fetch('/api/user/profile')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch profile');
      })
      .then(data => {
        setProfile(data);
        if (data.profile_image_url) {
          let url = data.profile_image_url;
          if (!url.startsWith('http')) {
             url = `https://cslab.kku.ac.kr:8088${url.startsWith('/') ? '' : '/'}${url}`;
          }
          setProfileImage(url);
        } else {
          setProfileImage(null);
        }
      })
      .catch(err => console.error('Error fetching profile:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.image) {
        setProfileImage(session.user.image);
      }
      
      fetchProfile();

      const handleProfileUpdate = () => {
        fetchProfile();
      };

      window.addEventListener('user-profile-updated', handleProfileUpdate);
      return () => {
        window.removeEventListener('user-profile-updated', handleProfileUpdate);
      };
    } else {
        setProfileImage(null);
        setProfile(null);
    }
  }, [status, session]);

  return { profileImage, profile, loading, session, status, refreshProfile: fetchProfile };


};
