const { checkPermission, isOwner } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: eval
 * Category: owner
 * Description: Execute arbitrary JavaScript code (OWNER ONLY)
 * 
 * SECURITY WARNING: This command executes arbitrary code with full access.
 * - Only permanent owner can use this
 * - All executions are logged
 * - Errors are not exposed to users
 */

const command = {
  pattern: 'eval',
  aliases: ['evaluate', 'js', 'execute'],
  description: 'Execute arbitrary JavaScript code (OWNER ONLY - DANGEROUS)',
  category: 'owner',
  usage: '<code>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission using centralized system
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'eval',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { codePreview: args.join(' ').substring(0, 50) },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command can only be used by the permanent owner');
    }
    
    const code = args.join(' ').trim();
    
    if (!code) {
      return reply('❌ Usage: .eval <javascript-code>\n\n⚠️ WARNING: This executes arbitrary code with full bot access!');
    }
    
    // Log the execution attempt BEFORE executing
    await logCommandExecution({
      command: 'eval',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { codePreview: code.substring(0, 200) + (code.length > 200 ? '...' : '') },
      success: true,
      permissionLevel: 'owner'
    });
    
    try {
      // Create a safe(r) execution context
      const result = await eval(code);
      
      const output = typeof result === 'object' 
        ? JSON.stringify(result, null, 2) 
        : String(result);
      
      // Truncate output if too long
      const truncatedOutput = output.length > 2000 
        ? output.substring(0, 2000) + '\n\n... (output truncated)' 
        : output;
      
      return reply(`✅ *Eval Result:*\n\`\`\`\n${truncatedOutput}\n\`\`\``);
    } catch (error) {
      // NEVER expose error details to non-owners
      const errorMsg = `❌ *Execution Error:*\n\`\`\`\n${error.message}\n\`\`\``;
      
      // Log the error internally
      console.error('[EVAL ERROR]', error);
      await logCommandExecution({
        command: 'eval',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { codePreview: code.substring(0, 200) },
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
