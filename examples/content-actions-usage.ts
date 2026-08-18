/**
 * Example of using contentActions in MetropolisJS
 */
import {FluxFramework} from '@nlabs/arkhamjs';
import type {ContentActions} from '../src/actions/contentActions/contentActions';
import {createAction} from '../src/utils/actionFactory';

// Create a flux instance and content actions
const flux = new FluxFramework();
const contentActions = createAction('content', flux) as unknown as ContentActions;

/**
 * Example 1: Adding content
 */
const addContentExample = async () => {
  try {
    const content = await contentActions.add({
      key: 'welcome_message',
      locale: 'en',
      content: 'Welcome to our application!',
      description: 'Welcome message for the homepage',
      category: 'homepage'
    });

    console.log('Content added:', content);
    return content;
  } catch (error) {
    console.error('Failed to add content:', error.message);
    return null;
  }
};

/**
 * Example 2: Fetching content by key and locale
 */
const getContentByKeyExample = async () => {
  try {
    // Get content by key and locale
    const content = await contentActions.itemByKey('welcome_message', 'en');

    console.log('Content retrieved:', content);
    return content;
  } catch (error) {
    console.error('Failed to get content:', error.message);
    return null;
  }
};

/**
 * Example 3: Updating content
 */
const updateContentExample = async (contentId: string) => {
  try {
    const updatedContent = await contentActions.update({
      contentId,
      key: 'welcome_message',
      content: 'Welcome to our updated application!',
      isActive: true
    });

    console.log('Content updated:', updatedContent);
    return updatedContent;
  } catch (error) {
    console.error('Failed to update content:', error.message);
    return null;
  }
};

/**
 * Example 4: Getting content by category
 */
const getContentByCategoryExample = async () => {
  try {
    const contentList = await contentActions.listByCategory('homepage');

    console.log(`Found ${contentList.length} content items in 'homepage' category`);
    return contentList;
  } catch (error) {
    console.error('Failed to get content by category:', error.message);
    return [];
  }
};

/**
 * Example 5: Deleting content
 */
const deleteContentExample = async (contentId: string) => {
  try {
    const deletedContent = await contentActions.delete(contentId);

    console.log('Content deleted:', deletedContent);
    return true;
  } catch (error) {
    console.error('Failed to delete content:', error.message);
    return false;
  }
};

// Example of using content in a React component
/*
import React, { useEffect, useState } from 'react';
import { useMetropolis } from '@nlabs/metropolisjs';

const WelcomeComponent = () => {
  const { contentActions } = useMetropolis(['content']);
  const [welcomeMessage, setWelcomeMessage] = useState('Loading...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        const content = await contentActions.itemByKey('welcome_message', 'en');
        setWelcomeMessage(content.content);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [contentActions]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="welcome-container">
      <h1>{welcomeMessage}</h1>
    </div>
  );
};

export default WelcomeComponent;
*/

export {
  addContentExample, deleteContentExample, getContentByCategoryExample, getContentByKeyExample,
  updateContentExample
};
