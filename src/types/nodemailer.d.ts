declare module "nodemailer" {
	export type SendMailOptions = {
		from?: string;
		to?: string;
		subject?: string;
		text?: string;
		html?: string;
		attachments?: Array<{
			filename?: string;
			content?: string | Buffer;
			path?: string;
			contentType?: string;
		}>;
	};

	export type Transporter = {
		sendMail: (options: SendMailOptions) => Promise<unknown>;
	};

	const nodemailer: {
		createTransport: (options: {
			host: string;
			port: number;
			secure?: boolean;
			auth?: {
				user: string;
				pass: string;
			};
		}) => Transporter;
	};

	export default nodemailer;
}
