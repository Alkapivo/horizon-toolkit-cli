export class DialogueParseException extends Error {
    constructor(message: string) {
        super(`ItemParseException: ${message}`);
    }
}

export interface Dialogue {
    name: string,
    startNode: string,
    nodes: {},
}

export interface DialogueNode {
    author: string,
    nextNode: string,
    text?: string,
    action?: string,
    choices?: DialogueChoice[],
    branches?: DialogueBranches,
}

export interface DialogueChoice {
    nextNode: string,
    text: string,
    conditionData?: string
}

export interface DialoguePackage {
    dialogues: Dialogue[];
}

export interface DialogueBranches {
    truthy: string,
    falsy: string
}