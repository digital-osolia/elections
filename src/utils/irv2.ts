/**
 * Code based off of https://github.com/PeterTheOne/IRV
 * Modified for my.osolia ballot format
 */

export type Ballots = string[][];

export type Totals = { [key: string]: number };

export interface ElectionResult {
	winnerName: string;
	winner: string;
	log: string[];
}

function countFirstVotes(candidates: string[], ballots: Ballots) {
	return countNVotes(1, candidates, ballots);
}

function countNVotes(
	n: number,
	candidates: string[],
	ballots: Ballots,
): Totals {
	const totals = {};

	for (const candidate of candidates) {
		totals[candidate] = 0;
	}

	for (const ballot of ballots) {
		if (ballot.length > 0) {
			totals[ballot[0]]++;
		}
	}

	return totals;
}

function calculateRoundWinners(totals: Totals) {
	let winners = [];
	let maxVotes = 0;

	for (const candidate in totals) {
		// console.log(totals[candidate]);
		const votesReceived = totals[candidate];

		if (votesReceived > maxVotes) {
			winners = [];
			winners.push(candidate);

			maxVotes = votesReceived;
		} else if (votesReceived === maxVotes) {
			winners.push(candidate);
		}
	}

	// console.log(winners);

	return winners;
}

function calculateRoundLosers(totals: Totals) {
	let losers = [];
	let minVotes = 1000;

	for (const candidate in totals) {
		const votesReceived = totals[candidate];

		if (votesReceived < minVotes) {
			losers = [];
			losers.push(candidate);

			minVotes = votesReceived;
		} else if (votesReceived === minVotes) {
			losers.push(candidate);
		}
	}

	return losers;
}

function calculateRoundLosersOfCandidates(
	candidates,
	firstVotes: Totals,
	ballotsCount: number,
) {
	let minVotes = ballotsCount + 1;
	let roundLosers = [];

	for (let i = 0; i < candidates.length; i++) {
		const candidate = candidates[i];

		if (firstVotes[candidate] < minVotes) {
			minVotes = firstVotes[candidate];
			roundLosers = [];
			roundLosers.push(candidate);
		} else if (firstVotes[candidate] == minVotes) {
			roundLosers.push(candidate);
		}
	}

	return roundLosers;
}

function removeLoserCandidate(
	candidateNames: { [key: string]: string },
	candidateIds: string[],
	roundLoser,
) {
	delete candidateNames[roundLoser];
	candidateIds.splice(candidateIds.indexOf(roundLoser), 1);

	return [candidateNames, candidateIds];
}

function removeLoserFromBallots(ballots: Ballots, roundLoser) {
	// console.log(roundLoser);

	const newBallots = ballots.map((ballot) =>
		ballot.filter((pick) => pick !== roundLoser),
	);

	return newBallots;
}

export function calculateWinner(
	candidateIds: string[],
	candidateNames: { [key: string]: string },
	ballots: Ballots,
	threshold = 50,
): ElectionResult {
	let round = 0;

	const log: string[] = [];

	do {
		log.push(`==== ROUND ${round + 1}`);

		log.push(
			`: THERE ARE ${Object.keys(candidateNames).length} candidates and ${
				ballots.length
			} ballots.\n`,
		);

		const firstVotes = countFirstVotes(candidateIds, ballots);

		const roundWinners = calculateRoundWinners(firstVotes);
		let roundLosers = calculateRoundLosers(firstVotes);

		const ratioOfWinnerVotes = firstVotes[roundWinners[0]] / ballots.length;
		const ratioOfLoserVotes = firstVotes[roundLosers[0]] / ballots.length;

		log.push(`== FIRST VOTES / CANDIDATE:`);

		// console.log(firstVotes);

		for (const candidate of candidateIds) {
			// console.log(candidate);

			log.push(candidateNames[candidate] + ': ' + firstVotes[candidate]);
		}

		log.push('');

		// console.log(roundWinners);

		if (roundWinners.length === 1) {
			log.push(
				`${
					candidateNames[roundWinners[0]]
				} has the highest number of votes with ${
					firstVotes[roundWinners[0]]
				} votes (${(100 * ratioOfWinnerVotes).toFixed(2)})`,
			);
		} else {
			log.push(
				`There is a tie for highest votes: ${
					roundWinners.length
				} candidates have the highest number of votes with ${
					firstVotes[roundWinners[0]]
				} votes (${(100 * ratioOfWinnerVotes).toFixed(2)}%)`,
			);

			log.push(
				roundWinners.map((winner) => candidateNames[winner]).join(', '),
			);
		}

		if (roundLosers.length === 1) {
			log.push(
				`${
					candidateNames[roundLosers[0]]
				} has the lowest number of votes with ${
					firstVotes[roundLosers[0]]
				} votes (${(100 * ratioOfLoserVotes).toFixed(2)})`,
			);
		} else {
			log.push(
				`There is a tie for lowest votes: ${
					roundLosers.length
				} candidates have the lowest number of votes with ${
					firstVotes[roundLosers[0]]
				} votes (${(100 * ratioOfLoserVotes).toFixed(2)})`,
			);

			log.push(
				roundLosers.map((loser) => candidateNames[loser]).join(', '),
			);
		}

		if (ratioOfWinnerVotes > threshold / 100) {
			const roundWinner = roundWinners[0];

			log.push(
				`${candidateNames[roundWinner]} has reached a majority (>50%)!`,
			);

			return {
				winner: roundWinner,
				winnerName: candidateNames[roundWinner],
				log,
			};
		}

		if (Object.keys(candidateIds).length === 2) {
			log.push('Nobody over threshold and only two candidates left.');

			return { winner: null, winnerName: null, log };
		}

		// console.log(roundLosers);

		let roundLoser = roundLosers[0];

		if (roundLosers.length > 1) {
			log.push('Tie for loser: using second, third, fourth, etc. votes.');

			let n = 2;

			while (
				roundLosers.length > 1 &&
				n <= Object.keys(candidateNames).length
			) {
				const nVotes = countNVotes(n, candidateIds, ballots);

				roundLosers = calculateRoundLosersOfCandidates(
					roundLosers,
					nVotes,
					ballots.length,
				);

				log.push(
					'Tiebreaker: Use ' +
						n +
						'. votes: ' +
						roundLosers.length +
						' losers left.',
				);

				n++;
			}

			if (roundLosers.length === 1) {
				roundLoser = roundLosers[0];

				log.push(
					'Tiebreaker: ' +
						candidateNames[roundLoser] +
						' was selected as the loser of the round.',
				);
			}
		}

		const [_candidateNames, _candidateIds]: any = removeLoserCandidate(
			candidateNames,
			candidateIds,
			roundLoser,
		);

		candidateNames = _candidateNames;
		candidateIds = _candidateIds;

		// console.log(candidateIds, candidateNames);

		ballots = removeLoserFromBallots(ballots, roundLoser);

		round++;
	} while (round < 100);

	return {
		winner: null,
		winnerName: null,
		log,
	};
}
