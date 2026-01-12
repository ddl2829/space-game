/**
 * 2D Vector math utilities for game physics and transformations.
 */
export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  /**
   * Creates a new Vector2 from x and y values.
   */
  static create(x: number, y: number): Vector2 {
    return new Vector2(x, y);
  }

  /**
   * Creates a zero vector (0, 0).
   */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /**
   * Creates a unit vector pointing right (1, 0).
   */
  static right(): Vector2 {
    return new Vector2(1, 0);
  }

  /**
   * Creates a unit vector pointing up (0, -1) in screen coordinates.
   */
  static up(): Vector2 {
    return new Vector2(0, -1);
  }

  /**
   * Creates a vector from an angle in radians.
   */
  static fromAngle(angle: number): Vector2 {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }

  /**
   * Creates a copy of this vector.
   */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * Sets the x and y values.
   */
  set(x: number, y: number): Vector2 {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Copies values from another vector.
   */
  copy(v: Vector2): Vector2 {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /**
   * Adds another vector to this one.
   */
  add(v: Vector2): Vector2 {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Returns a new vector that is the sum of this and another.
   */
  added(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /**
   * Subtracts another vector from this one.
   */
  subtract(v: Vector2): Vector2 {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Returns a new vector that is this minus another.
   */
  subtracted(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /**
   * Multiplies this vector by a scalar.
   */
  multiply(scalar: number): Vector2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * Returns a new vector scaled by a scalar.
   */
  multiplied(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /**
   * Divides this vector by a scalar.
   */
  divide(scalar: number): Vector2 {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    }
    return this;
  }

  /**
   * Returns a new vector divided by a scalar.
   */
  divided(scalar: number): Vector2 {
    if (scalar === 0) return this.clone();
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  /**
   * Returns the magnitude (length) of this vector.
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Returns the squared magnitude (avoids sqrt for performance).
   */
  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Normalizes this vector to unit length.
   */
  normalize(): Vector2 {
    const mag = this.magnitude();
    if (mag > 0) {
      this.divide(mag);
    }
    return this;
  }

  /**
   * Returns a new normalized vector.
   */
  normalized(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) return Vector2.zero();
    return this.divided(mag);
  }

  /**
   * Limits the magnitude of this vector.
   */
  limit(max: number): Vector2 {
    const magSq = this.magnitudeSquared();
    if (magSq > max * max) {
      this.normalize().multiply(max);
    }
    return this;
  }

  /**
   * Returns the dot product with another vector.
   */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Returns the cross product (z-component in 3D) with another vector.
   */
  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * Returns the distance to another vector.
   */
  distance(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Returns the squared distance to another vector.
   */
  distanceSquared(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Returns the angle of this vector in radians.
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Returns the angle between this and another vector in radians.
   */
  angleTo(v: Vector2): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  /**
   * Rotates this vector by an angle in radians.
   */
  rotate(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Returns a new vector rotated by an angle.
   */
  rotated(angle: number): Vector2 {
    return this.clone().rotate(angle);
  }

  /**
   * Linearly interpolates between this and another vector.
   */
  lerp(v: Vector2, t: number): Vector2 {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  /**
   * Returns a new vector interpolated between this and another.
   */
  lerped(v: Vector2, t: number): Vector2 {
    return this.clone().lerp(v, t);
  }

  /**
   * Checks if this vector equals another (within epsilon).
   */
  equals(v: Vector2, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon
    );
  }

  /**
   * Returns a string representation.
   */
  toString(): string {
    return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}
