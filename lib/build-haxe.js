'use babel'

import LimeStrategy from './strategies/lime'

const strategies = [
  LimeStrategy
]

function flattenCommands(commands, strategy) {
  return commands.concat(strategy.settings())
}

export const config = {
  ...LimeStrategy.config
}

export function provideBuilder() {
  return class HaxeBuildProvider {
    constructor(cwd) {
      this.cwd = cwd
      this.eligibleStrategies = []
      this.strategies = strategies
        .map(Strategy => new Strategy(cwd))
    }

    getNiceName() {
      return 'Haxe'
    }

    tryStrategy(strategy) {
      return strategy.isEligible()
        .then(eligible => {
          if (eligible) {
            this.eligibleStrategies.push(strategy)
          }
          return eligible
        })
    }

    isEligible() {
      this.eligibleStrategies = []

      const checks = this.strategies
        .map(strategy => this.tryStrategy(strategy))

      return Promise.all(checks)
        .then(list => !!list.filter(v => v).length)
    }

    settings() {
      return this.strategies.reduce(flattenCommands, [])
    }
  }
}
