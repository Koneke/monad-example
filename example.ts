/*
	monads are usually really, REALLY poorly explained,
	because people keep talking about them like this really high-level math concept,
	while in reality, they are really just a design pattern,
	as in, it's really just... code! not really math at all!
	(unless you want to understand all the shit behind it,
	 but you really don't need to in order to use them)

	all monads follow a very simple pattern, containing the following pieces:
		1. a wrapping type, generally some kind of generic<T>
		   let's call it Wrapped<T>
		2. a function called return
		   which creates an instance of that wrapping type, Wrapped<T> from a "naked" T
		3. and a function called bind,
			 which takes a Wrapped<T> and a function T => Wrapped<T>,
			 and returns a Wrapped<T>
			 (strictly speaking, that function is T => Wrapped<U>, but that's for another day)
*/

// Let's do some examples!
// To start with, let's create a monad,
// that lets us trace/log everything we do to a value

// we start off with our wrapper type.
// basically, we just want to take a value: T,
// and add unto it a list of all operations we've done to it so far
type Logged<T> = {
  value: T;
  logs: string[];
};

// then, our "return" function,
// taking our "naked" T and adding the logging structure to it
const returnLogged: <T>(value: T) => Logged<T> = (value) => ({
  value,
  logs: [], // nothing has been done yet, so our log is empty
});

/*
	and this is then our "bind" function, where the magic happens;
	this is where we "encapsulate" the extra stuff we want to do.
	in this case, handling the logging.

	so we take a wrapped value,
	and a function fn:
		that operates on an entirely normal value T,
		returns what any old normal function would,
		but ALSO the log of what has happened to the value.

	then, our bind function applied that function fn,
	to the value "inside" the Logged<T>,
	and concatenates the logs of the two together.
	i.e.,
	keeping our current log history
	and just adding whatever new entries to it the function fn returned.
*/
const bindLogged: <T>(
  wrapped: Logged<T>,
  fn: (value: T) => Logged<T>
) => Logged<T> = (wrapped, fn) => {
  const next = fn(wrapped.value);

  return {
    value: next.value,
    logs: wrapped.logs.concat(next.logs),
  };
};

// usage example

const square: (x: number) => Logged<number> = (x) => ({
  value: x * x, // this is the entirety of what we'd normally do in a square function
  logs: [`squared ${x}`], // this is the extra part adding our logging
});

const double: (x: number) => Logged<number> = (x) => ({
  // same here
  value: x * 2, // business as usual
  logs: [`doubled ${x}`], // logging
});

// square/double can focus on their "main calculation"
// with only a VERY minor addition that gives quite a lot of bang for buck!

// the neat thing is that this will work for ANY type T,
// not just number like we used here :)

// so, let's use our functions to do some stuff
const y = bindLogged(bindLogged(returnLogged(5), square), double);

console.log(y);
/*
	> {
	  value: 50, // <- the calculated value
	  logs: [ // <- our log of what has happened to the value
	    "squared 5",
	    "doubled 25"
	  ]
	}
*/

// ===

// it's quite verbose though, but it can be simplified with clever use of reduce
// (which might not work in some languages, if we use U as briefly mentioned above.
//  but as long as we're working on some same type T, it should work)

const y2 = [square, double] // <- list of the stuff we want to do
  .reduce(
    // applying our functions one at a time in a chain
    (loggedX, fn) => bindLogged(loggedX, fn),
    // initialise our value by wrapping it, moving it from naked-land into monad-land
    returnLogged(5)
  );

console.log(y2);
// > undefined
// i.e., y2 === y :)

// ============================================================================

// let's do another one, Maybe, a classic!

// same as before, a wrapper type
type Maybe<T> = T | undefined;

// a return, going from our "naked" type to our wrapper type
const returnMaybe: <T>(value: T) => Maybe<T> = (value) => value;

// ... and a bind, taking a wrapped value,
// a function that operates on a normal value,
// and does our magic "encapsulated logic"
// finally returning a wrapped value (a Maybe<T>)
const bindMaybe: <T>(
  wrapped: Maybe<T>,
  fn: (value: T) => Maybe<T>
) => Maybe<T> = (wrapped, fn) =>
  wrapped !== undefined ? fn(wrapped) : undefined;

// then, some functions working with Maybe

/*
	this might look a bit funky,
	because normally we'd just do (divisor: number, x: number) => ...
	this is just so we can pass a (x: number) => Maybe<number> to bindMaybe later
	it turns out the two are actually mathematically equivalent,
	but we're using a funky concept called Currying (https://en.wikipedia.org/wiki/Currying)
	to pass one parameter at a time! :)
*/
const divide: (divisor: number) => (x: number) => Maybe<number> =
  (divisor) => (x) =>
    divisor !== 0
      ? x / divisor // <- our ordinary case
      : undefined; // <- our case where we need to return undefined

// just a filler function, do some random operation on x
// (but note how it's just x, not x | undefined! :))
const whatever: (x: number) => Maybe<number> = (x) => x + 42;

// we can then do something like this
const z = bindMaybe(bindMaybe(returnMaybe(10), divide(0)), whatever);

console.log(z);
// > undefined

// whatever(x) would ordinarily get an undefined x since we divided by 0,
// but the Maybe monad handles the undefined value,
// and automatically skips the call to "whatever"!
// so all our functions in the chain are free to assume that their input is defined!

// this is actually the exact same way the ? acts normally in ts/c#! :)
// all the ? stuff is actually just the Maybe monad in disguise!

// similarily to above, some magic reduce stuff...

const z2 = [divide(0), whatever].reduce(
  (maybeX, fn) => bindMaybe(maybeX, fn),
  returnMaybe(10)
);

console.log(z2);
// > undefined
// as expected :)
