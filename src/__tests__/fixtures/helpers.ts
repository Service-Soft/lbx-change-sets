/**
 * Sleeps for the given amount of milliseconds.
 * You need to await this to work.
 *
 * @param ms - The amount of milliseconds everything should sleep.
 */
export async function sleep(ms: number): Promise<void> {
    return new Promise( resolve => setTimeout(resolve, ms) );
}