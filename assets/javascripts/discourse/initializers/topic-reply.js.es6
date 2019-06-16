import { withPluginApi } from "discourse/lib/plugin-api";
import { transformBasicPost } from "discourse/lib/transform-post";
import transformPost from "discourse/lib/transform-post";
import { createWidget, applyDecorators } from "discourse/widgets/widget";
import Quote from "discourse/lib/quote";
import { postTransformCallbacks } from "discourse/widgets/post-stream";
import { h } from "virtual-dom";
import PostCooked from "discourse/widgets/post-cooked";
import DecoratorHelper from "discourse/widgets/decorator-helper";
import { ajax } from "discourse/lib/ajax";
import DiscourseURL from "discourse/lib/url";
import Composer from "discourse/models/composer";
import Draft from "discourse/models/draft";
function initializeTestPlugin(api) {
	api.modifyClass('route:topic-from-params', {
		beforeModel(transition) {
			 if(transition.to.queryParams.sendmessage){
				 this.set("replyTOMes",true);
				 this.set("messBody",transition.to.queryParams.messagebody);
			 }
		 },
		  setupController(controller, params) {
		    params = params || {};
		    params.track_visit = true;
		    const self = this,
		      topic = this.modelFor("topic"),
		      postStream = topic.get("postStream"),
		      topicController = this.controllerFor("topic"),
		      composerController = this.controllerFor("composer");
		    if (params.nearPost === "last") {
		      params.nearPost = 999999999;
		    }
		    params.forceLoad = true;
		    postStream
		      .refresh(params)
		      .then(function() {
		        const closestPost = postStream.closestPostForPostNumber(
		          params.nearPost || 1
		        );
		        const closest = closestPost.get("post_number");
		        topicController.setProperties({
		          "model.currentPost": closest,
		          enteredIndex: topic
		            .get("postStream")
		            .progressIndexOfPost(closestPost),
		          enteredAt: new Date().getTime().toString()
		        });
		        topicController.subscribe();
		        Ember.run.scheduleOnce("afterRender", function() {
		          self.appEvents.trigger("post:highlight", closest);
		        });
		        const opts = {};
		        if (document.location.hash && document.location.hash.length) {
		          opts.anchor = document.location.hash;
		        }
		        DiscourseURL.jumpToPost(closest, opts);
		        if (!Ember.isEmpty(topic.get("draft"))) {
		        	if(!self.get("replyTOMes")){
		        		composerController.open({
				            draft: Draft.getLocal(topic.get("draft_key"), topic.get("draft")),
				            draftKey: topic.get("draft_key"),
				            draftSequence: topic.get("draft_sequence"),
				            topic: topic,
				            ignoreIfChanged: true
				          });
		        	}
		        }
		        const opts1 = {
						action: Composer.REPLY,
						draftKey: topic.get("draft_key"),
						draftSequence: topic.get("draft_sequence"),
						topicBody:self.get("messBody"),
						skipDraftCheck:true,
						
				};
		        if(closest != 1){
		        	opts1.post = closestPost;
		        }
		        opts1.topic = topic
				if( self.get("replyTOMes")){
					composerController.open(opts1);
				}
		        self.set("replyTOMes",undefined); 
		        self.set("messBody",undefined);
		      })
		      .catch(e => {
		        if (!Ember.testing) {
		          console.log("Could not view topic", e);
		        }
		      });
		  }
	});
}
export default {
	name: "topic-reply.js",
	initialize() {
		withPluginApi("0.1", initializeTestPlugin);
	}
};
