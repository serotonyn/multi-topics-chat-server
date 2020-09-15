import { ObjectType, Field } from "type-graphql";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  RelationId,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Message extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  text!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  topic: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  color: string;

  @Field(() => User)
  @ManyToOne(() => User)
  user: User;
  @RelationId((message: Message) => message.user)
  userId: number;

  @Field(() => User)
  @ManyToOne(() => User)
  otherUser: User;
  @RelationId((message: Message) => message.user)
  otherUserId: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
