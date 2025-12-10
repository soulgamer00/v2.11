import { prisma } from './db';

export interface ErrorLogContext {
	path?: string;
	method?: string;
	userId?: string;
	context?: string;
}

/**
 * Log an error to the database
 * @param error - The error object or message
 * @param context - Optional context information (path, method, userId, etc.)
 */
export async function logError(error: unknown, context?: ErrorLogContext | string): Promise<string> {
	const errorId = crypto.randomUUID();
	
	try {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : null;
		
		// Handle context as string (simple case) or object (detailed case)
		let logContext: ErrorLogContext = {};
		if (typeof context === 'string') {
			logContext = { context };
		} else if (context) {
			logContext = context;
		}
		
		// Build message with context if provided
		let finalMessage = errorMessage;
		if (logContext.context) {
			finalMessage = `[${logContext.context}] ${errorMessage}`;
		}
		
		await prisma.errorLog.create({
			data: {
				id: errorId,
				path: logContext.path || 'Unknown',
				method: logContext.method || 'UNKNOWN',
				message: finalMessage,
				stack: errorStack,
				userId: logContext.userId || null
			}
		});
		
		console.error(`[ErrorLog ${errorId}] ${finalMessage}`, error);
		
		return errorId;
	} catch (logError) {
		// If logging fails, at least log to console
		console.error('Failed to log error to database:', logError);
		console.error('Original error:', error);
		return errorId;
	}
}

