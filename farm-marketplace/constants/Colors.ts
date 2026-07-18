import { useTheme } from '../context/ThemeContext';
import { lightColors, darkColors } from './ThemeColors';

const useColors = () => {
  const { isDark } = useTheme();
  return isDark ? darkColors : lightColors;
};

export default useColors;