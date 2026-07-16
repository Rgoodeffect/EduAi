/** Base class for domain entities identified by a stable UUID. */
export abstract class Entity<Props> {
  protected readonly props: Props;
  public readonly id: string;

  protected constructor(props: Props, id: string) {
    this.props = props;
    this.id = id;
  }

  equals(other?: Entity<Props>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}
