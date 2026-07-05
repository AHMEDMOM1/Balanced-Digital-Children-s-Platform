import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';
import { useGame, logGameActivity } from '../../../services/api/games';
import useAuthStore from '../../../store/useAuthStore';
import { getBiDiStyle, formatBiDiText } from '../../../services/utils/bidi';
import { useSessionWriter } from '../../../services/api/sessions';

type CountingConfig = {
  type: 'counting';
  question: string;
  image_url?: string;
  correct_answer: number;
  choices: number[];
  display?: 'image' | 'interactive';
  emoji?: string;
};

type MatchingConfig = {
  type: 'matching';
  pairs: Array<{ item: string; image: string }>;
  display?: 'columns' | 'quiz';
};

type SortingConfig = {
  type: 'sorting';
  instruction: string;
  items: number[];
  correct_order: number[];
};

type QuizQuestion = {
  question: string;
  choices: string[];
  correct_index: number;
};

type QuizConfig = {
  type: 'quiz';
  questions: QuizQuestion[];
};

type MemoryConfig = {
  type: 'memory';
  pairs: Array<{ id: string; emoji: string }>;
  cols: number;
};

type GameConfig = CountingConfig | MatchingConfig | SortingConfig | QuizConfig | MemoryConfig;

export default function GameScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: game, isLoading, error } = useGame(id as string);
  const childData = useAuthStore((s: any) => s.childData);
  const [startedAt] = useState(() => Date.now());
  const mountTimeRef = useRef(Date.now());
  const { openSession, closeSession } = useSessionWriter(
    childData?.id ?? '',
    childData?.familyId ?? '',
    'game',
    id as string
  );

  useEffect(() => {
    if (!childData?.id) return;
    mountTimeRef.current = Date.now();
    openSession();
    return () => {
      const elapsed = Math.round((Date.now() - mountTimeRef.current) / 1000);
      closeSession(elapsed);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Counting game state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [won, setWon] = useState(false);

  // Matching game state
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [matchedItems, setMatchedItems] = useState<Set<string>>(new Set());
  const [showMatchWrong, setShowMatchWrong] = useState(false);

  // Sorting game state
  const [sortingCurrent, setSortingCurrent] = useState<number[]>([]);
  const [sortingAvailable, setSortingAvailable] = useState<number[]>([]);
  
  // Quiz game state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizShowFeedback, setQuizShowFeedback] = useState(false);

  // Quiz matching state
  const [matchRound, setMatchRound] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [matchWrongId, setMatchWrongId] = useState<string | null>(null);

  // Memory game state
  const [memoryCards, setMemoryCards] = useState<Array<{ id: string; emoji: string; flipped: boolean; matched: boolean }>>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [memoryLocked, setMemoryLocked] = useState(false);
  const [memoryInit, setMemoryInit] = useState(false);

  useEffect(() => {
    if (game?.game_type === 'sorting') {
      setSortingAvailable((game.config_json as SortingConfig).items);
      setSortingCurrent([]);
    }
  }, [game]);

  useEffect(() => {
    if (game?.game_type === 'memory' && !memoryInit) {
      const memory = game.config_json as MemoryConfig;
      const cards = memory.pairs.flatMap(p => [
        { id: p.id, emoji: p.emoji, flipped: false, matched: false },
        { id: p.id, emoji: p.emoji, flipped: false, matched: false },
      ]);
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      setMemoryCards(cards);
      setMemoryInit(true);
    }
  }, [game, memoryInit]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.winCenter}>
          <ActivityIndicator testID="loading-indicator" size="large" color={Colors.child.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !game) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.winCenter}>
          <Text style={styles.wonSubtitle}>Could not load game</Text>
          <TouchableOpacity style={styles.homeBtn3D} onPress={() => router.back()}>
            <Text style={styles.homeBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = game.config_json as GameConfig;

  const handleWin = () => {
    setWon(true);
    if (childData?.id) {
      logGameActivity({
        childId: childData.id,
        gameId: id as string,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      });
    }
  };

  const handleAnswer = (choice: number) => {
    if (showFeedback) return;
    setSelectedAnswer(choice);
    setShowFeedback(true);
    if (choice === (config as CountingConfig).correct_answer) {
      setTimeout(handleWin, 800);
    } else {
      setTimeout(() => {
        setShowFeedback(false);
        setSelectedAnswer(null);
      }, 600);
    }
  };

  const handleMatchingWin = () => {
    setWon(true);
    if (childData?.id) {
      logGameActivity({
        childId: childData.id,
        gameId: id as string,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      });
    }
  };

  const handleLabelTap = (item: string) => {
    if (matchedItems.has(item)) return;
    setSelectedLabel(item);
  };

  const handleImageTap = (pair: { item: string; image: string }) => {
    if (!selectedLabel || matchedItems.has(pair.item)) return;
    if (selectedLabel === pair.item) {
      const next = new Set(matchedItems);
      next.add(pair.item);
      setMatchedItems(next);
      setSelectedLabel(null);
      if (next.size === (config as MatchingConfig).pairs.length) {
        setTimeout(handleMatchingWin, 800);
      }
    } else {
      setShowMatchWrong(true);
      setTimeout(() => {
        setShowMatchWrong(false);
        setSelectedLabel(null);
      }, 600);
    }
  };

  const handleSortingTap = (item: number, from: 'available' | 'current') => {
    if (from === 'available') {
      const newAvailable = sortingAvailable.filter(x => x !== item);
      const newCurrent = [...sortingCurrent, item];
      setSortingAvailable(newAvailable);
      setSortingCurrent(newCurrent);
      
      if (newAvailable.length === 0) {
        const configOrder = (config as SortingConfig).correct_order;
        if (JSON.stringify(newCurrent) === JSON.stringify(configOrder)) {
          setTimeout(handleWin, 800);
        } else {
          // Reset on wrong
          setTimeout(() => {
             setSortingAvailable((config as SortingConfig).items);
             setSortingCurrent([]);
          }, 800);
        }
      }
    } else {
      const newCurrent = sortingCurrent.filter(x => x !== item);
      const newAvailable = [...sortingAvailable, item];
      setSortingCurrent(newCurrent);
      setSortingAvailable(newAvailable);
    }
  };

  const handleQuizAnswer = (index: number) => {
    if (quizShowFeedback) return;
    setQuizSelected(index);
    setQuizShowFeedback(true);
    
    const quiz = config as QuizConfig;
    const isCorrect = index === quiz.questions[quizIndex].correct_index;
    
    if (isCorrect) {
      setTimeout(() => {
        if (quizIndex === quiz.questions.length - 1) {
          handleWin();
        } else {
          setQuizIndex(prev => prev + 1);
          setQuizSelected(null);
          setQuizShowFeedback(false);
        }
      }, 800);
    } else {
      setTimeout(() => {
        setQuizSelected(null);
        setQuizShowFeedback(false);
      }, 800);
    }
  };

  const handleMemoryFlip = (index: number) => {
    if (memoryLocked) return;
    if (memoryCards[index].flipped || memoryCards[index].matched) return;
    if (flippedIndices.length === 2) return;

    const newCards = [...memoryCards];
    newCards[index] = { ...newCards[index], flipped: true };
    setMemoryCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryLocked(true);
      const first = memoryCards[newFlipped[0]];
      const second = memoryCards[newFlipped[1]];
      if (first.id === second.id) {
        setTimeout(() => {
          const matchedCards = [...memoryCards];
          matchedCards[newFlipped[0]] = { ...matchedCards[newFlipped[0]], matched: true };
          matchedCards[newFlipped[1]] = { ...matchedCards[newFlipped[1]], matched: true };
          setMemoryCards(matchedCards);
          setFlippedIndices([]);
          setMemoryLocked(false);
          if (matchedCards.every(c => c.matched)) {
            setTimeout(handleWin, 500);
          }
        }, 400);
      } else {
        setTimeout(() => {
          const resetCards = [...memoryCards];
          resetCards[newFlipped[0]] = { ...resetCards[newFlipped[0]], flipped: false };
          resetCards[newFlipped[1]] = { ...resetCards[newFlipped[1]], flipped: false };
          setMemoryCards(resetCards);
          setFlippedIndices([]);
          setMemoryLocked(false);
        }, 1000);
      }
    }
  };

  // ── Win Screen ──
  if (won) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.winCenter}>
          <Animated.Text entering={BounceIn.duration(1000)} style={styles.hugeEmoji}>
            🌟
          </Animated.Text>
          <Text style={styles.wonTitle}>Amazing Job!</Text>
          <Text style={styles.wonSubtitle}>You earned 1 star!</Text>

          <View style={styles.wonStarsRow}>
            <Animated.View entering={BounceIn.delay(200)}>
              <Ionicons name="star" size={36} color={Colors.child.tertiaryFixedDim} />
            </Animated.View>
          </View>

          <TouchableOpacity style={styles.homeBtn3D} onPress={() => router.back()}>
            <Ionicons name="home" size={24} color={Colors.child.onPrimary} />
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Counting Game ──
  if (game.game_type === 'counting') {
    const counting = config as CountingConfig;
    const isInteractive = counting.display === 'interactive';
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="home" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
          <View style={styles.starsPill}>
            <Ionicons name="star" size={24} color={Colors.child.tertiaryFixedDim} />
          </View>
          <TouchableOpacity style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.questionSection}>
            <Text style={[styles.question, getBiDiStyle(counting.question)]}>{formatBiDiText(counting.question)}</Text>
            <Text style={styles.subQuestion}>Count them all!</Text>
          </View>

          <Animated.View entering={FadeInDown.duration(500)} style={styles.gameCard}>
            {isInteractive && counting.emoji ? (
              <View style={styles.interactiveGrid}>
                {Array.from({ length: counting.correct_answer }, (_, i) => (
                  <Animated.View
                    key={i}
                    entering={BounceIn.delay(i * 80).duration(400)}
                    style={[
                      styles.interactiveItem,
                      {
                        left: `${15 + (i * 23) % 70}%`,
                        top: `${10 + (i * 17 + i * i * 3) % 75}%`,
                      },
                    ]}
                  >
                    <Text style={styles.interactiveEmoji}>{counting.emoji}</Text>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Image
                source={{ uri: counting.image_url || '' }}
                style={styles.gameImage}
                resizeMode="contain"
                accessibilityLabel={counting.question}
              />
            )}
            <View style={styles.gameDecor1} />
            <View style={styles.gameDecor2} />
          </Animated.View>

          <View style={styles.answersRow}>
            {counting.choices.map(choice => {
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === counting.correct_answer;
              const showCorrect = showFeedback && isSelected && isCorrect;
              const showWrong = showFeedback && isSelected && !isCorrect;
              return (
                <TouchableOpacity
                  key={choice}
                  onPress={() => handleAnswer(choice)}
                  activeOpacity={0.8}
                  style={[
                    styles.answerBtn,
                    showCorrect && styles.answerBtnCorrect,
                    showWrong && styles.answerBtnWrong,
                  ]}
                >
                  <Text style={[styles.answerText, showCorrect && styles.answerTextCorrect]}>
                    {choice}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Matching Game ──
  if (game.game_type === 'matching') {
    const matching = config as MatchingConfig;
    const isQuiz = matching.display === 'quiz';

    if (isQuiz) {
      const unmatched = matching.pairs.filter(p => !matchedPairs.has(p.item));
      const currentTarget = unmatched[matchRound % unmatched.length] || matching.pairs[0];
      const shuffledOptions = [...matching.pairs].sort(() => Math.random() - 0.5);

      const handleQuizMatch = (item: string) => {
        if (matchWrongId) return;
        if (item === currentTarget.item) {
          const next = new Set(matchedPairs);
          next.add(item);
          setMatchedPairs(next);
          setMatchRound(prev => prev + 1);
          if (next.size === matching.pairs.length) {
            setTimeout(handleWin, 500);
          }
        } else {
          setMatchWrongId(item);
          setTimeout(() => setMatchWrongId(null), 600);
        }
      };

      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn3D} activeOpacity={0.7}>
              <Ionicons name="home" size={28} color={Colors.child.primary} />
            </TouchableOpacity>
            <View style={styles.starsPill}>
              <Ionicons name="star" size={24} color={Colors.child.tertiaryFixedDim} />
              <Text style={{ fontSize: 14, color: Colors.child.primary, fontWeight: '700' }}>
                {matchedPairs.size}/{matching.pairs.length}
              </Text>
            </View>
            <TouchableOpacity style={styles.headerBtn3D} activeOpacity={0.7}>
              <Ionicons name="help-circle-outline" size={28} color={Colors.child.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.questionSection}>
              <Text style={styles.subQuestion}>Find the match!</Text>
            </View>

            <Animated.View entering={FadeInDown.duration(400)} style={styles.matchTargetCard}>
              <Text style={styles.matchTargetLabel}>{formatBiDiText(currentTarget.item)}</Text>
              <View style={styles.matchTargetImageWrap}>
                <Image
                  source={{ uri: currentTarget.image }}
                  style={styles.matchTargetImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>

            <View style={styles.matchOptionsGrid}>
              {shuffledOptions.map(p => {
                const isWrong = matchWrongId === p.item;
                return (
                  <TouchableOpacity
                    key={p.item}
                    onPress={() => handleQuizMatch(p.item)}
                    activeOpacity={0.8}
                    style={[
                      styles.matchOptionBtn,
                      matchedPairs.has(p.item) && styles.matchOptionDone,
                      isWrong && styles.matchOptionWrong,
                    ]}
                    disabled={matchedPairs.has(p.item)}
                  >
                    <Image
                      source={{ uri: p.image }}
                      style={styles.matchOptionImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.matchOptionLabel}>{p.item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      );
    }

    // Legacy columns matching
    const unmatched = matching.pairs.filter(p => !matchedItems.has(p.item));
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="home" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
          <View style={styles.starsPill}>
            <Ionicons name="star" size={24} color={Colors.child.tertiaryFixedDim} />
          </View>
          <TouchableOpacity style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.matchingContainer}>
            <View style={styles.matchingLabels}>
              {unmatched.map(p => (
                <TouchableOpacity
                  key={p.item}
                  style={[styles.matchLabel, selectedLabel === p.item && styles.matchLabelSelected]}
                  onPress={() => handleLabelTap(p.item)}
                >
                  <Text style={styles.matchLabelText}>{p.item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.matchingImages}>
              {unmatched.map(p => (
                <TouchableOpacity
                  key={p.item}
                  testID={`image-${p.item}`}
                  style={[styles.matchImageCard, showMatchWrong && styles.matchImageCardWrong]}
                  onPress={() => handleImageTap(p)}
                >
                  <Image
                    source={{ uri: p.image }}
                    style={styles.matchImage}
                    resizeMode="contain"
                    accessibilityLabel={p.item}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Sorting Game ──
  if (game.game_type === 'sorting') {
    const sorting = config as SortingConfig;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="home" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
          <View style={styles.starsPill}>
            <Ionicons name="star" size={24} color={Colors.child.tertiaryFixedDim} />
          </View>
          <TouchableOpacity style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.questionSection}>
            <Text style={[styles.question, getBiDiStyle(sorting.instruction)]}>{formatBiDiText(sorting.instruction)}</Text>
          </View>

          {/* Current Selection Area */}
          <View style={styles.sortingArea}>
            {sortingCurrent.map((item, idx) => (
              <TouchableOpacity key={`curr-${idx}-${item}`} onPress={() => handleSortingTap(item, 'current')} style={styles.sortingBlockCurrent}>
                <Text style={styles.sortingTextCurrent}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Available Items */}
          <View style={styles.sortingAvailableRow}>
            {sortingAvailable.map((item, idx) => (
              <TouchableOpacity key={`avail-${idx}-${item}`} onPress={() => handleSortingTap(item, 'available')} style={styles.sortingBlockAvailable}>
                <Text style={styles.sortingTextAvailable}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Memory Game ──
  if (game.game_type === 'memory') {
    const memory = config as MemoryConfig;
    const cols = memory.cols || 4;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="home" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
          <View style={styles.starsPill}>
            <Ionicons name="star" size={24} color={Colors.child.tertiaryFixedDim} />
          </View>
          <TouchableOpacity style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.questionSection}>
            <Text style={styles.subQuestion}>Find the matching pairs!</Text>
          </View>

          <View style={[styles.memoryGrid, { flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
            {memoryCards.map((card, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleMemoryFlip(idx)}
                activeOpacity={0.8}
                style={[
                  styles.memoryCard,
                  {
                    width: `${Math.floor(85 / cols)}%`,
                    aspectRatio: 1,
                  },
                  card.flipped || card.matched ? styles.memoryCardFlipped : styles.memoryCardDown,
                  card.matched && styles.memoryCardMatched,
                ]}
              >
                {card.flipped || card.matched ? (
                  <Animated.View entering={BounceIn.duration(300)} style={styles.memoryCardFront}>
                    <Text style={styles.memoryCardEmoji}>{card.emoji}</Text>
                  </Animated.View>
                ) : (
                  <View style={styles.memoryCardBack}>
                    <Ionicons name="help" size={28} color={Colors.child.primaryFixedDim} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Quiz Game ──
  if (game.game_type === 'quiz') {
    const quiz = config as QuizConfig;
    const currentQ = quiz.questions[quizIndex];
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="home" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
          <View style={styles.starsPill}>
            <Ionicons name="star" size={24} color={Colors.child.tertiaryFixedDim} />
            <Text style={{ ...Typography.child.button, color: Colors.child.primary }}>{quizIndex + 1} / {quiz.questions.length}</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn3D} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.child.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.questionSection}>
            <Text style={[styles.question, getBiDiStyle(currentQ.question)]}>{formatBiDiText(currentQ.question)}</Text>
          </View>

          <View style={styles.quizChoices}>
            {currentQ.choices.map((choice, idx) => {
              const isSelected = quizSelected === idx;
              const isCorrect = idx === currentQ.correct_index;
              const showCorrect = quizShowFeedback && isSelected && isCorrect;
              const showWrong = quizShowFeedback && isSelected && !isCorrect;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleQuizAnswer(idx)}
                  activeOpacity={0.8}
                  style={[
                    styles.quizBtn,
                    showCorrect && styles.answerBtnCorrect,
                    showWrong && styles.answerBtnWrong,
                  ]}
                >
                  <Text style={[styles.quizText, showCorrect && styles.answerTextCorrect, getBiDiStyle(choice)]}>
                    {formatBiDiText(choice)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Unknown game type ──
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.winCenter}>
        <Text style={styles.wonSubtitle}>Game type not supported</Text>
        <TouchableOpacity style={styles.homeBtn3D} onPress={() => router.back()}>
          <Text style={styles.homeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFE0E0',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screen.paddingHorizontal,
    paddingVertical: Layout.spacing.md,
  },
  headerBtn3D: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.child.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderBottomColor: Colors.child.primary,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  starsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.child.surfaceContainerLowest,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Layout.radius.full,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  // ── Content ──
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Layout.screen.paddingHorizontal,
    paddingTop: Layout.spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: Layout.spacing.xxl,
  },
  questionSection: {
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  question: {
    ...Typography.child.hero,
    color: Colors.child.primary,
    marginBottom: 4,
  },
  subQuestion: {
    ...Typography.child.subtitle,
    color: Colors.child.textSecondary,
  },

  // ── Game Card (Counting) ──
  gameCard: {
    backgroundColor: Colors.child.surfaceContainerLowest,
    width: '100%',
    borderRadius: 24,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 4,
    borderColor: Colors.child.surfaceVariant,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 6,
  },
  gameImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  gameDecor1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.child.tertiaryFixedDim,
    opacity: 0.15,
  },
  gameDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.child.primaryFixed,
    opacity: 0.15,
  },

  // ── Answer Buttons ──
  answersRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: Layout.spacing.xxl,
  },
  answerBtn: {
    width: 72,
    height: 72,
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderBottomColor: Colors.child.outline,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  answerBtnCorrect: {
    backgroundColor: Colors.child.primary,
    borderBottomColor: '#3A2570',
  },
  answerBtnWrong: {
    backgroundColor: Colors.child.errorContainer,
    borderBottomColor: Colors.child.error,
  },
  answerText: {
    ...Typography.child.hero,
    fontSize: 28,
    color: Colors.child.textPrimary,
  },
  answerTextCorrect: {
    color: Colors.child.onPrimary,
  },

  // ── Matching Game ──
  matchingContainer: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
  },
  matchingLabels: {
    flex: 1,
    gap: 12,
  },
  matchingImages: {
    flex: 1,
    gap: 12,
    alignItems: 'center',
  },
  matchLabel: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderBottomWidth: 4,
    borderBottomColor: Colors.child.outline,
  },
  matchLabelSelected: {
    backgroundColor: Colors.child.primaryFixed,
  },
  matchLabelText: {
    ...Typography.child.subtitle,
    color: Colors.child.textPrimary,
  },
  matchImageCard: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.child.surfaceContainerLowest,
  },
  matchImageCardWrong: {
    borderWidth: 2,
    borderColor: Colors.child.error,
  },
  matchImage: {
    width: '100%',
    height: '100%',
  },

  // ── Win Screen ──
  winCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screen.paddingHorizontal,
  },
  hugeEmoji: {
    fontSize: 100,
    marginBottom: Layout.spacing.xl,
  },
  wonTitle: {
    ...Typography.child.hero,
    color: Colors.child.primary,
    marginBottom: 8,
  },
  wonSubtitle: {
    ...Typography.child.subtitle,
    color: Colors.child.textSecondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xl,
  },
  wonStarsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Layout.spacing.xxxl,
  },
  homeBtn3D: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.child.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: Layout.radius.full,
    borderBottomWidth: 6,
    borderBottomColor: '#3A2570',
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 6,
  },
  homeBtnText: {
    ...Typography.child.button,
    color: Colors.child.onPrimary,
  },

  // ── Sorting Game Styles ──
  sortingArea: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.child.surfaceVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: Layout.spacing.xxxl,
  },
  sortingBlockCurrent: {
    width: 50,
    height: 50,
    backgroundColor: Colors.child.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortingTextCurrent: {
    ...Typography.child.hero,
    fontSize: 24,
    color: Colors.child.onPrimary,
  },
  sortingAvailableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  sortingBlockAvailable: {
    width: 64,
    height: 64,
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderBottomColor: Colors.child.outline,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sortingTextAvailable: {
    ...Typography.child.hero,
    fontSize: 28,
    color: Colors.child.textPrimary,
  },

  // ── Quiz Game Styles ──
  quizChoices: {
    width: '100%',
    gap: 16,
    marginTop: Layout.spacing.xl,
  },
  quizBtn: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderBottomColor: Colors.child.outline,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  quizText: {
    ...Typography.child.hero,
    fontSize: 24,
    color: Colors.child.textPrimary,
  },

  // ── Interactive Counting Styles ──
  interactiveGrid: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  interactiveItem: {
    position: 'absolute',
  },
  interactiveEmoji: {
    fontSize: 40,
  },

  // ── Quiz Matching Styles ──
  matchTargetCard: {
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 4,
    borderColor: Colors.child.primaryFixed,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  matchTargetLabel: {
    ...Typography.child.hero,
    fontSize: 28,
    color: Colors.child.primary,
    marginBottom: 12,
  },
  matchTargetImageWrap: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.child.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTargetImage: {
    width: '100%',
    height: '100%',
  },
  matchOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: Layout.spacing.xl,
  },
  matchOptionBtn: {
    width: '45%',
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 6,
    borderBottomColor: Colors.child.outline,
    shadowColor: Colors.child.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  matchOptionDone: {
    opacity: 0.4,
  },
  matchOptionWrong: {
    backgroundColor: Colors.child.errorContainer,
    borderBottomColor: Colors.child.error,
  },
  matchOptionImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  matchOptionLabel: {
    ...Typography.child.subtitle,
    color: Colors.child.textPrimary,
  },

  // ── Memory Game Styles ──
  memoryGrid: {
    width: '100%',
    justifyContent: 'center',
    gap: 8,
  },
  memoryCard: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    maxWidth: 80,
    maxHeight: 80,
  },
  memoryCardDown: {
    backgroundColor: Colors.child.primaryFixed,
    borderWidth: 3,
    borderColor: Colors.child.primaryFixedDim,
  },
  memoryCardFlipped: {
    backgroundColor: Colors.child.surfaceContainerLowest,
    borderWidth: 3,
    borderColor: Colors.child.primaryContainer,
  },
  memoryCardMatched: {
    backgroundColor: '#D4EDDA',
    borderColor: '#4CAF50',
    opacity: 0.7,
  },
  memoryCardFront: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryCardEmoji: {
    fontSize: 32,
  },
  memoryCardBack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
