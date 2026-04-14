# thompson-sampler

This is AI-generated code with Gemini 3 pro and Google Jules. 

Uses Bayesian machine learning to choose which of two functions to call on the basis of execution time and failure modes.

exports a function choose(F,G,reset)
   where F ang G are user provided functions, async or sync, with or without arguments
   reset({ err: error, args; [...]})  is a user provided function to call on error
   choose(F,G,reset) returns a function(args) that will call either F(args) or G(args) as it chooses

AI-SOURCED EXPLANATION:

To implement a Gittens Index approach for function execution times, we treat the problem as a Multi-Armed Bandit. 
Since execution times are strictly positive and often right-skewed, we will model them using a Normal-Gamma conjugate prior on the log-transformed times (making the underlying distribution Lognormal).

The Gittens Index measures the "reward" (speed) plus the "option value" of the information gained. In practice, calculating the exact Gittens Index is computationally heavy, so we use 
Thompson Sampling—a standard Bayesian stochastic equivalent that naturally balances exploration and exploitation.

Prior is chosen for an uncertainty of milliseconds to seconds in the expected range of execution times.


