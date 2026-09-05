const { checkPermission } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Command: exec
 * Category: owner
 * Description: Execute shell commands (OWNER ONLY)
 * 
 * SECURITY WARNING: This command executes arbitrary shell commands.
 * - Only permanent owner can use this
 * - All executions are logged
 * - Output is sanitized and truncated
 */

const command = {
  pattern: 'exec',
  aliases: ['shell', 'sh', 'cmd'],
  description: 'Execute shell commands (OWNER ONLY - DANGEROUS)',
  category: 'owner',
  usage: '<command>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission using centralized system
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'exec',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { commandPreview: args.join(' ').substring(0, 50) },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command can only be used by the permanent owner');
    }
    
    const shellCommand = args.join(' ').trim();
    
    if (!shellCommand) {
      return reply('❌ Usage: .exec <shell-command>\n\n⚠️ WARNING: This executes arbitrary shell commands with bot privileges!');
    }
    
    // SECURITY: Block dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//i,
      /dd\s+if=/i,
      /mkfs/i,
      /chmod\s+-R\s+777\s+\//i,
      /:\(\)\{\s*:\|:\s*&\s*\}/i,  // Fork bomb
      /curl.*\|.*sh/i,
      /wget.*\|.*sh/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(shellCommand)) {
        await logCommandExecution({
          command: 'exec',
          senderJid,
          chatId,
          isGroup: chatId.endsWith('@g.us'),
          parameters: { blockedCommand: shellCommand.substring(0, 100) },
          success: false,
          error: 'Dangerous command blocked',
          permissionLevel: 'owner'
        });
        return reply('❌ BLOCKED: This command pattern is not allowed for security reasons');
      }
    }
    
    // Log the execution attempt BEFORE executing
    await logCommandExecution({
      command: 'exec',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { commandPreview: shellCommand.substring(0, 200) },
      success: true,
      permissionLevel: 'owner'
    });
    
    try {
      // Execute with timeout (max 30 seconds)
      const { stdout, stderr } = await execAsync(shellCommand, {
        timeout: 30000,
        maxBuffer: 1024 * 1024 // 1MB max output
      });
      
      const output = stderr ? `STDERR:\n${stderr}\n\nSTDOUT:\n${stdout}` : stdout;
      
      // Truncate output if too long
      const truncatedOutput = output.length > 2000 
        ? output.substring(0, 2000) + '\n\n... (output truncated)' 
        : output || '(no output)';
      
      return reply(`✅ *Shell Command Result:*\n\`\`\`\n${truncatedOutput}\n\`\`\``);
    } catch (error) {
      const errorMsg = error.killed 
        ? 'Command timed out (max 30 seconds)'
        : `❌ *Execution Error:*\n\`\`\`\n${error.message}\n\`\`\``;
      
      // Log the error internally
      console.error('[EXEC ERROR]', error);
      await logCommandExecution({
        command: 'exec',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { commandPreview: shellCommand.substring(0, 200) },
        success: false,
        error: error.message,
        permissionLevel: 'owner'
      });
      
      return reply(errorMsg);
    }
  }
};

// Missing module.exports fixed
module.exports = command;
