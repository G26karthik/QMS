import { Topic } from '../types';

export const mockData: Topic[] = [
  {
    id: 'topic-1',
    name: 'Arrays & Hashing',
    order: 0,
    subTopics: [
      {
        id: 'subtopic-1-1',
        name: 'Basic Array Problems',
        order: 0,
        questions: [
          {
            id: 'q-1-1-1',
            title: 'Two Sum',
            order: 0,
            difficulty: 'Easy',
            link: 'https://leetcode.com/problems/two-sum/',
          },
          {
            id: 'q-1-1-2',
            title: 'Contains Duplicate',
            order: 1,
            difficulty: 'Easy',
            link: 'https://leetcode.com/problems/contains-duplicate/',
          },
          {
            id: 'q-1-1-3',
            title: 'Valid Anagram',
            order: 2,
            difficulty: 'Easy',
            link: 'https://leetcode.com/problems/valid-anagram/',
          },
        ],
      },
      {
        id: 'subtopic-1-2',
        name: 'Advanced Array Problems',
        order: 1,
        questions: [
          {
            id: 'q-1-2-1',
            title: 'Group Anagrams',
            order: 0,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/group-anagrams/',
          },
          {
            id: 'q-1-2-2',
            title: 'Top K Frequent Elements',
            order: 1,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/top-k-frequent-elements/',
          },
          {
            id: 'q-1-2-3',
            title: 'Product of Array Except Self',
            order: 2,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/product-of-array-except-self/',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-2',
    name: 'Two Pointers',
    order: 1,
    subTopics: [
      {
        id: 'subtopic-2-1',
        name: 'Basic Two Pointer',
        order: 0,
        questions: [
          {
            id: 'q-2-1-1',
            title: 'Valid Palindrome',
            order: 0,
            difficulty: 'Easy',
            link: 'https://leetcode.com/problems/valid-palindrome/',
          },
          {
            id: 'q-2-1-2',
            title: 'Two Sum II - Input Array Is Sorted',
            order: 1,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/',
          },
        ],
      },
      {
        id: 'subtopic-2-2',
        name: 'Advanced Two Pointer',
        order: 1,
        questions: [
          {
            id: 'q-2-2-1',
            title: '3Sum',
            order: 0,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/3sum/',
          },
          {
            id: 'q-2-2-2',
            title: 'Container With Most Water',
            order: 1,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/container-with-most-water/',
          },
          {
            id: 'q-2-2-3',
            title: 'Trapping Rain Water',
            order: 2,
            difficulty: 'Hard',
            link: 'https://leetcode.com/problems/trapping-rain-water/',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-3',
    name: 'Sliding Window',
    order: 2,
    subTopics: [
      {
        id: 'subtopic-3-1',
        name: 'Fixed Window',
        order: 0,
        questions: [
          {
            id: 'q-3-1-1',
            title: 'Best Time to Buy and Sell Stock',
            order: 0,
            difficulty: 'Easy',
            link: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
          },
          {
            id: 'q-3-1-2',
            title: 'Longest Substring Without Repeating Characters',
            order: 1,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
          },
        ],
      },
      {
        id: 'subtopic-3-2',
        name: 'Variable Window',
        order: 1,
        questions: [
          {
            id: 'q-3-2-1',
            title: 'Longest Repeating Character Replacement',
            order: 0,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/longest-repeating-character-replacement/',
          },
          {
            id: 'q-3-2-2',
            title: 'Minimum Window Substring',
            order: 1,
            difficulty: 'Hard',
            link: 'https://leetcode.com/problems/minimum-window-substring/',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-4',
    name: 'Stack',
    order: 3,
    subTopics: [
      {
        id: 'subtopic-4-1',
        name: 'Basic Stack',
        order: 0,
        questions: [
          {
            id: 'q-4-1-1',
            title: 'Valid Parentheses',
            order: 0,
            difficulty: 'Easy',
            link: 'https://leetcode.com/problems/valid-parentheses/',
          },
          {
            id: 'q-4-1-2',
            title: 'Min Stack',
            order: 1,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/min-stack/',
          },
        ],
      },
      {
        id: 'subtopic-4-2',
        name: 'Monotonic Stack',
        order: 1,
        questions: [
          {
            id: 'q-4-2-1',
            title: 'Daily Temperatures',
            order: 0,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/daily-temperatures/',
          },
          {
            id: 'q-4-2-2',
            title: 'Largest Rectangle in Histogram',
            order: 1,
            difficulty: 'Hard',
            link: 'https://leetcode.com/problems/largest-rectangle-in-histogram/',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-5',
    name: 'Binary Search',
    order: 4,
    subTopics: [
      {
        id: 'subtopic-5-1',
        name: 'Basic Binary Search',
        order: 0,
        questions: [
          {
            id: 'q-5-1-1',
            title: 'Binary Search',
            order: 0,
            difficulty: 'Easy',
            link: 'https://leetcode.com/problems/binary-search/',
          },
          {
            id: 'q-5-1-2',
            title: 'Search a 2D Matrix',
            order: 1,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/search-a-2d-matrix/',
          },
        ],
      },
      {
        id: 'subtopic-5-2',
        name: 'Advanced Binary Search',
        order: 1,
        questions: [
          {
            id: 'q-5-2-1',
            title: 'Koko Eating Bananas',
            order: 0,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/koko-eating-bananas/',
          },
          {
            id: 'q-5-2-2',
            title: 'Find Minimum in Rotated Sorted Array',
            order: 1,
            difficulty: 'Medium',
            link: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/',
          },
          {
            id: 'q-5-2-3',
            title: 'Median of Two Sorted Arrays',
            order: 2,
            difficulty: 'Hard',
            link: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
          },
        ],
      },
    ],
  },
];
