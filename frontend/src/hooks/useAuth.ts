import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

export const useLogin = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
  });
};

export const useRegister = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logout();
      navigate('/login');
    },
  });
};
