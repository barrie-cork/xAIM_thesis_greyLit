/**
 * Task Master CLI - Commands Module
 * Contains the main command handling logic for the Task Master CLI
 */

import fs from 'fs';
import path from 'path';

/**
 * Run the CLI with the given arguments
 * @param {string[]} args - Command line arguments
 */
export function runCLI(args) {
  const command = args[2];
  const options = parseOptions(args.slice(3));
  
  console.log(`Task Master CLI - Running command: ${command}`);
  console.log('Options:', options);
  
  switch (command) {
    case 'generate':
      generateTaskFiles(options);
      break;
    case 'expand':
      expandTask(options);
      break;
    case 'show':
      showTask(options);
      break;
    case 'list':
      listTasks(options);
      break;
    case 'set-status':
      setTaskStatus(options);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

/**
 * Parse command line options into an object
 * @param {string[]} args - Command line arguments
 * @returns {object} - Parsed options
 */
function parseOptions(args) {
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value || true;
    } else if (arg.startsWith('-')) {
      options[arg.slice(1)] = true;
    } else {
      // Positional argument
      if (!options.args) options.args = [];
      options.args.push(arg);
    }
  });
  
  return options;
}

/**
 * Show task details
 * @param {object} options - Command options
 */
function showTask(options) {
  const taskId = options.id || options.args?.[0];
  if (!taskId) {
    console.log('Error: Task ID is required');
    return;
  }
  
  try {
    const tasksFile = options.file || 'tasks/tasks.json';
    if (!fs.existsSync(tasksFile)) {
      console.log(`Error: Tasks file not found: ${tasksFile}`);
      return;
    }
    
    const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    const task = findTask(tasksData.tasks, taskId);
    
    if (!task) {
      console.log(`Error: Task with ID ${taskId} not found`);
      return;
    }
    
    console.log(`\nTask: #${task.id} - ${task.title}`);
    console.log(`Status: ${task.status}`);
    console.log(`Priority: ${task.priority}`);
    console.log(`Dependencies: ${task.dependencies?.join(', ') || 'None'}`);
    console.log(`Description: ${task.description}`);
    
    if (task.details) {
      console.log('\nDetails:');
      console.log(task.details);
    }
    
    if (task.testStrategy) {
      console.log('\nTest Strategy:');
      console.log(task.testStrategy);
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
      console.log('\nSubtasks:');
      task.subtasks.forEach(subtask => {
        console.log(`- ${subtask.id}: ${subtask.title} (${subtask.status})`);
      });
    }
  } catch (error) {
    console.log(`Error showing task: ${error.message}`);
  }
}

/**
 * Find a task by ID in the tasks array
 * @param {Array} tasks - Array of tasks
 * @param {string|number} taskId - Task ID to find
 * @returns {object|null} - Found task or null
 */
function findTask(tasks, taskId) {
  // Handle subtask IDs (e.g., "1.2")
  if (String(taskId).includes('.')) {
    const [parentId, subtaskId] = String(taskId).split('.');
    const parentTask = tasks.find(t => String(t.id) === String(parentId));
    
    if (parentTask && parentTask.subtasks) {
      return parentTask.subtasks.find(s => String(s.id) === String(subtaskId));
    }
    
    return null;
  }
  
  return tasks.find(t => String(t.id) === String(taskId));
}

/**
 * List all tasks
 * @param {object} options - Command options
 */
function listTasks(options) {
  try {
    const tasksFile = options.file || 'tasks/tasks.json';
    if (!fs.existsSync(tasksFile)) {
      console.log(`Error: Tasks file not found: ${tasksFile}`);
      return;
    }
    
    const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    
    console.log('\nTasks:');
    tasksData.tasks.forEach(task => {
      console.log(`#${task.id}: ${task.title} (${task.status})`);
      
      if (options.withSubtasks && task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          console.log(`  - ${subtask.id}: ${subtask.title} (${subtask.status})`);
        });
      }
    });
  } catch (error) {
    console.log(`Error listing tasks: ${error.message}`);
  }
}

/**
 * Generate individual task files
 * @param {object} options - Command options
 */
function generateTaskFiles(options) {
  try {
    const tasksFile = options.file || 'tasks/tasks.json';
    const outputDir = options.output || 'tasks';
    
    if (!fs.existsSync(tasksFile)) {
      console.log(`Error: Tasks file not found: ${tasksFile}`);
      return;
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    
    // Process each task
    tasksData.tasks.forEach(task => {
      try {
        const filePath = path.join(outputDir, `task_${String(task.id).padStart(3, '0')}.txt`);
        
        let content = '';
        content += `# Task ID: ${task.id}\n`;
        content += `# Title: ${task.title}\n`;
        content += `# Status: ${task.status}\n`;
        content += `# Dependencies: ${task.dependencies?.join(', ') || ''}\n`;
        content += `# Priority: ${task.priority}\n`;
        content += `# Description: ${task.description}\n`;
        
        if (task.details) {
          content += `# Details:\n`;
          if (typeof task.details === 'string') {
            content += `${task.details}\n\n`;
          } else if (typeof task.details === 'object') {
            content += `${JSON.stringify(task.details, null, 2)}\n\n`;
          }
        }
        
        if (task.testStrategy) {
          content += `# Test Strategy:\n`;
          if (typeof task.testStrategy === 'string') {
            content += `${task.testStrategy}\n`;
          } else if (typeof task.testStrategy === 'object') {
            content += `${JSON.stringify(task.testStrategy, null, 2)}\n`;
          }
        }
        
        // Add subtasks if they exist
        if (task.subtasks && task.subtasks.length > 0) {
          content += `\n# Subtasks:\n`;
          task.subtasks.forEach(subtask => {
            content += `## Subtask ID: ${subtask.id}\n`;
            content += `## Title: ${subtask.title}\n`;
            content += `## Status: ${subtask.status}\n`;
            content += `## Dependencies: ${subtask.dependencies?.join(', ') || ''}\n`;
            content += `## Description: ${subtask.description}\n`;
            
            if (subtask.details) {
              content += `## Details:\n`;
              if (typeof subtask.details === 'string') {
                content += `${subtask.details}\n\n`;
              } else if (typeof subtask.details === 'object') {
                content += `${JSON.stringify(subtask.details, null, 2)}\n\n`;
              }
            }
          });
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`Generated: ${filePath}`);
      } catch (error) {
        console.log(`Error generating file for task ${task.id}: ${error.message}`);
      }
    });
  } catch (error) {
    console.log(`Error generating task files: ${error.message}`);
  }
}

/**
 * Set task status
 * @param {object} options - Command options
 */
function setTaskStatus(options) {
  try {
    const taskId = options.id;
    const status = options.status;
    
    if (!taskId || !status) {
      console.log('Error: Both --id and --status are required');
      return;
    }
    
    const tasksFile = options.file || 'tasks/tasks.json';
    if (!fs.existsSync(tasksFile)) {
      console.log(`Error: Tasks file not found: ${tasksFile}`);
      return;
    }
    
    const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    
    // Handle subtask IDs (e.g., "1.2")
    if (String(taskId).includes('.')) {
      const [parentId, subtaskId] = String(taskId).split('.');
      const parentTask = tasksData.tasks.find(t => String(t.id) === String(parentId));
      
      if (parentTask && parentTask.subtasks) {
        const subtask = parentTask.subtasks.find(s => String(s.id) === String(subtaskId));
        if (subtask) {
          subtask.status = status;
          console.log(`Updated status of subtask ${taskId} to "${status}"`);
        } else {
          console.log(`Error: Subtask with ID ${subtaskId} not found in task ${parentId}`);
          return;
        }
      } else {
        console.log(`Error: Task with ID ${parentId} not found or has no subtasks`);
        return;
      }
    } else {
      const task = tasksData.tasks.find(t => String(t.id) === String(taskId));
      if (task) {
        task.status = status;
        console.log(`Updated status of task ${taskId} to "${status}"`);
      } else {
        console.log(`Error: Task with ID ${taskId} not found`);
        return;
      }
    }
    
    fs.writeFileSync(tasksFile, JSON.stringify(tasksData, null, 2));
    console.log(`Updated tasks file: ${tasksFile}`);
    
    // Regenerate task files
    generateTaskFiles(options);
  } catch (error) {
    console.log(`Error setting task status: ${error.message}`);
  }
}

/**
 * Expand a task with subtasks
 * @param {object} options - Command options
 */
function expandTask(options) {
  const taskId = options.id;
  if (!taskId) {
    console.log('Error: Task ID is required (--id=<id>)');
    return;
  }
  
  console.log(`Expanding task ${taskId}`);
  console.log('This feature is not fully implemented. Please use task-master instead.');
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Task Master CLI - Help
  
Available commands:
  generate           Generate individual task files
  show <id>          Show task details
  list               List all tasks
  set-status         Set task status
  expand             Expand a task with subtasks
`);
} 