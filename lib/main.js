'use strict';

const PluginTools = module.parent.exports;
const N26 = require('n26');


new PluginTools.Config({
    id: 'email',
    type: 'text',
    label: 'plugins.label.email',
    defaultValue: '{{email}}',
    placeholder: 'mail@example.com'
});
new PluginTools.Config({
    id: 'password',
    type: 'password',
    label: 'plugins.label.password'
});


module.exports = class {
    /**
     * @throws {PluginTools.ConfigurationError|PluginTools.ConfigurationErrors}
     * @returns {Promise.<void>}
     */
    static async validateConfig() {
        if(!PluginTools.config('email')) {
            throw new PluginTools.ConfigurationError({
                field: 'email',
                code: 'empty'
            });
        }
        if(!PluginTools.config('password')) {
            throw new PluginTools.ConfigurationError({
                field: 'password',
                code: 'empty'
            });
        }

        try {
            await new N26(PluginTools.config('email'), PluginTools.config('password'));
        }
        catch(err) {
            throw new PluginTools.ConfigurationErrors([
                {
                    field: 'email',
                    code: 'invalid'
                },
                {
                    field: 'password',
                    code: 'invalid'
                }
            ]);
        }
    }

    /**
     * @returns {Promise.<PluginTools.Account[]>}
     */
    static async getAccounts() {
        const account = await new N26(PluginTools.config('email'), PluginTools.config('password'));
        const accountInfo = await account.account();

        return [
            new PluginTools.Account({
                id: accountInfo.id,
                name: accountInfo.bankName,
                type: 'checking',
                balance: Math.round(accountInfo.availableBalance * 100)
            })
        ];
    }

    /**
     * @param {string} accountId Account id submitted via getAccounts()
     * @param {Moment} since Moment of the timestamp
     * @returns {Promise.<PluginTools.Transaction[]>}
     */
    static async getTransactions(accountId, since) {
        const account = await new N26(PluginTools.config('email'), PluginTools.config('password'));
        const transactions = await account.transactions({
            from: since.unix()
        });

        return transactions.map(transaction => {
            return new PluginTools.Transaction({
                id: transaction.id,
                time: new Date(transaction.visibleTS),
                payeeId: transaction.merchantName || transaction.partnerName,
                memo: transaction.referenceText,
                amount: Math.round(transaction.amount * 100),
                status: transaction.pending ? 'pending' : 'cleared'
            });
        });
    }
};