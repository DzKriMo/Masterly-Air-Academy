import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isTablet = width >= 768;
export const isLandscape = width >= 1024;
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
