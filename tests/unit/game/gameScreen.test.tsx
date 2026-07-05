import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import GameScreen from '../../../app/(child)/game/[id]';
import { useGame, logGameActivity } from '../../../services/api/games';
import type { GameItem } from '../../../services/api/types';

jest.mock('../../../services/api/games', () => ({
  useGame: jest.fn(),
  logGameActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/api/sessions', () => ({
  useSessionWriter: jest.fn(() => ({
    sessionId: null,
    openSession: jest.fn().mockResolvedValue(undefined),
    closeSession: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'test-id' })),
  useRouter: jest.fn(() => ({ back: jest.fn() })),
}));

jest.mock('../../../store/useAuthStore', () => ({
  __esModule: true,
  default: jest.fn((selector: any) => selector({ childData: { id: 'child-1' } })),
}));

const mockUseGame = useGame as jest.Mock;
const mockLogGameActivity = logGameActivity as jest.Mock;

const countingGame: GameItem = {
  id: 'test-id',
  title: 'Count the Apples',
  type: 'game',
  category: 'math',
  min_age: 2,
  max_age: 7,
  thumbnail_url: 'https://example.com/thumb.jpg',
  game_type: 'counting',
  config_json: {
    type: 'counting',
    question: 'How many apples are in the basket?',
    image_url: 'https://picsum.photos/seed/test/400/300',
    correct_answer: 5,
    choices: [3, 4, 5, 6],
  },
};

const matchingGame: GameItem = {
  id: 'test-id',
  title: 'Match the Animals',
  type: 'game',
  category: 'animals',
  min_age: 2,
  max_age: 7,
  thumbnail_url: 'https://example.com/thumb.jpg',
  game_type: 'matching',
  config_json: {
    type: 'matching',
    pairs: [
      { item: 'Dog', image: 'https://picsum.photos/seed/dog/200/200' },
      { item: 'Cat', image: 'https://picsum.photos/seed/cat/200/200' },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLogGameActivity.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('loading state', () => {
  it('shows ActivityIndicator when isLoading is true', async () => {
    mockUseGame.mockReturnValue({ data: null, error: null, isLoading: true, isOffline: false });
    const { getByTestId } = await render(<GameScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});

describe('error state', () => {
  it('shows error message and back button when error is set', async () => {
    mockUseGame.mockReturnValue({ data: null, error: 'Network error', isLoading: false, isOffline: false });
    const { getByText } = await render(<GameScreen />);
    expect(getByText('Could not load game')).toBeTruthy();
    expect(getByText('Go Back')).toBeTruthy();
  });

  it('shows fallback error state for unknown game_type', async () => {
    mockUseGame.mockReturnValue({
      data: { ...countingGame, game_type: 'unknown', config_json: { type: 'unknown' } },
      error: null,
      isLoading: false,
      isOffline: false,
    });
    const { getByText } = await render(<GameScreen />);
    expect(getByText('Game type not supported')).toBeTruthy();
  });
});

describe('counting game (US1)', () => {
  beforeEach(() => {
    mockUseGame.mockReturnValue({ data: countingGame, error: null, isLoading: false, isOffline: false });
  });

  it('renders question text from config_json.question', async () => {
    const { getByText } = await render(<GameScreen />);
    expect(getByText('How many apples are in the basket?')).toBeTruthy();
  });

  it('renders a button for each choice', async () => {
    const { getByText } = await render(<GameScreen />);
    expect(getByText('3')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
  });

  it('pressing correct answer transitions to win screen', async () => {
    const { getByText } = await render(<GameScreen />);
    jest.useFakeTimers();
    fireEvent.press(getByText('5'));
    await jest.advanceTimersByTimeAsync(900);
    expect(getByText('Amazing Job!')).toBeTruthy();
  });

  it('pressing wrong answer keeps game screen visible', async () => {
    const { getByText } = await render(<GameScreen />);
    fireEvent.press(getByText('3'));
    // wrong answer: game stays on counting screen (no win transition)
    expect(getByText('How many apples are in the basket?')).toBeTruthy();
  });

  it('calls logGameActivity on counting win', async () => {
    const { getByText } = await render(<GameScreen />);
    jest.useFakeTimers();
    fireEvent.press(getByText('5'));
    await jest.advanceTimersByTimeAsync(900);
    expect(mockLogGameActivity).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 'child-1', gameId: 'test-id' })
    );
  });
});

describe('matching game (US2)', () => {
  beforeEach(() => {
    mockUseGame.mockReturnValue({ data: matchingGame, error: null, isLoading: false, isOffline: false });
  });

  it('renders label cards for each pair item', async () => {
    const { getByText } = await render(<GameScreen />);
    expect(getByText('Dog')).toBeTruthy();
    expect(getByText('Cat')).toBeTruthy();
  });

  it('calls logGameActivity on matching win', async () => {
    const { getByText, getByTestId } = await render(<GameScreen />);
    // Wrap each press in act to flush state between interactions
    await act(async () => { fireEvent.press(getByText('Dog')); });
    await act(async () => { fireEvent.press(getByTestId('image-Dog')); });
    await act(async () => { fireEvent.press(getByText('Cat')); });
    // Install fake timers before the final press that registers the win timeout
    jest.useFakeTimers();
    fireEvent.press(getByTestId('image-Cat'));
    await jest.advanceTimersByTimeAsync(900);
    expect(mockLogGameActivity).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 'child-1', gameId: 'test-id' })
    );
  });
});
