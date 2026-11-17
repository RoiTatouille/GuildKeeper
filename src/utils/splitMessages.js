export function splitMessages(blocks, {
    header = '',
    separator = '\n\n',
    limit = 2000
} = {}) {
    const messages = [];
    let currentMessage = header;

    for (const block of blocks) {
        if (header.length + block.length > limit) {
            throw new RangeError('The text block exceeds the message length limit');
        }

        const currentSeparator = currentMessage === header ? '' : separator;

        if (currentMessage.length + currentSeparator.length + block.length > limit) {
            if (currentMessage !== header) {
                messages.push(currentMessage);
            }

            currentMessage = header + block;
        } else {
            currentMessage += currentSeparator + block;
        }
    }

    if (currentMessage !== header) {
        messages.push(currentMessage);
    }

    return messages;
}