/**
 * Seed script for Firebase Emulator
 * Populates Firestore with test data for development
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

async function seedData() {
  console.log('🌱 Seeding Firebase Emulator with test data...\n');

  try {
    // Seed Questions
    console.log('Creating quiz questions...');
    const questions = [
      {
        period: 'first-half',
        questionNumber: 1,
        type: 'multiple-choice',
        text: 'What is the capital of France?',
        choices: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 'Paris',
        skipAttributes: [],
      },
      {
        period: 'first-half',
        questionNumber: 2,
        type: 'multiple-choice',
        text: 'What is 2 + 2?',
        choices: ['3', '4', '5', '6'],
        correctAnswer: '4',
        skipAttributes: [],
      },
      {
        period: 'second-half',
        questionNumber: 1,
        type: 'multiple-choice',
        text: 'Which planet is closest to the Sun?',
        choices: ['Venus', 'Earth', 'Mercury', 'Mars'],
        correctAnswer: 'Mercury',
        skipAttributes: ['age-under-10'],
      },
    ];

    for (const question of questions) {
      await db.collection('questions').add(question);
    }
    console.log(`✅ Created ${questions.length} questions\n`);

    // Seed Guests
    console.log('Creating guests...');
    const guests = [
      {
        id: 'guest-alice',
        name: 'Alice',
        status: 'alive',
        attributes: ['age-20-30', 'gender-female'],
        authMethod: 'anonymous',
      },
      {
        id: 'guest-bob',
        name: 'Bob',
        status: 'alive',
        attributes: ['age-30-40', 'gender-male'],
        authMethod: 'anonymous',
      },
      {
        id: 'guest-charlie',
        name: 'Charlie',
        status: 'eliminated',
        attributes: ['age-40-50', 'gender-male'],
        authMethod: 'anonymous',
      },
      {
        id: 'guest-diana',
        name: 'Diana',
        status: 'alive',
        attributes: ['age-20-30', 'gender-female'],
        authMethod: 'anonymous',
      },
    ];

    for (const guest of guests) {
      await db.collection('guests').doc(guest.id).set({
        name: guest.name,
        status: guest.status,
        attributes: guest.attributes,
        authMethod: guest.authMethod,
      });
    }
    console.log(`✅ Created ${guests.length} guests\n`);

    // Initialize Game State
    console.log('Initializing game state...');
    await db.collection('gameState').doc('current').set({
      phase: 'idle',
      activeQuestionId: null,
      isGongActive: false,
      results: null,
    });
    console.log('✅ Game state initialized\n');

    console.log('🎉 Seeding complete! Emulator is ready for testing.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed
seedData();
