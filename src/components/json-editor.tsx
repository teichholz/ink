import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import fs from 'fs/promises';
import path from 'path';
import { parseJson, JsonValueNode } from '../json-tree/json-tree.js';

type JsonEditorProps = {
  /**
   * Path to the JSON file to edit
   */
  filePath: string | null;
};

export function JsonEditor({ filePath }: JsonEditorProps) {
  const [content, setContent] = useState<string>('');
  const [jsonTree, setJsonTree] = useState<JsonValueNode | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      if (!filePath) {
        setContent('');
        setJsonTree(null);
        setError(null);
        return;
      }

      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        setContent(fileContent);
        
        try {
          const parsedJson = parseJson(fileContent);
          setJsonTree(parsedJson as JsonValueNode);
          setError(null);
        } catch (parseError) {
          setJsonTree(null);
          setError(parseError instanceof Error ? parseError : new Error(String(parseError)));
        }
      } catch (fileError) {
        setContent('');
        setJsonTree(null);
        setError(fileError instanceof Error ? fileError : new Error(String(fileError)));
      }
    };

    loadFile();
  }, [filePath]);

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error loading JSON file:</Text>
        <Text color="red">{error.message}</Text>
      </Box>
    );
  }

  if (!filePath) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>No file selected</Text>
      </Box>
    );
  }

  if (!content) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text>Editing: {path.basename(filePath)}</Text>
      <Box marginTop={1} flexDirection="column">
        {content.split('\n').map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
