// Virtual-filesystem commands. See src/utils/vfs.ts for the backing store.
import { lsCmd, cdCmd, catCmd, pwdCmd } from '../vfs';

export const ls = async (args: string[]): Promise<string> => lsCmd(args);
export const cd = async (args: string[]): Promise<string> => cdCmd(args);
export const cat = async (args: string[]): Promise<string> => catCmd(args);
export const pwd = async (args: string[]): Promise<string> => pwdCmd();
