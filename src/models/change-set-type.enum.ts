/**
 * The type of the change set.
 * Can bei either CREATE, REPLACE, RESET, UPDATE or DELETE.
 */
export enum ChangeSetType {
    CREATE = 'create',
    REPLACE = 'replace',
    RESET = 'reset',
    UPDATE = 'update',
    DELETE = 'delete',
    RESTORE = 'restore'
}